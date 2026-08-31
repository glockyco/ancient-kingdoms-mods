#nullable disable
using System;
using System.Collections;
using System.Reflection;
using Il2Cpp;
using Il2CppTMPro;
using UnityEngine;
using UnityEngine.UI;

namespace CombatVerification.Materialization
{
    /// <summary>
    /// Creates a fixture character by driving the game's character creator.
    /// </summary>
    /// <remarks>
    /// The creator is the only authority for two things a fixture must not invent. It holds the
    /// pairing of a class with a race, as one enabled or disabled button for each class. It also
    /// chooses the basic skill a new character learns, the starting city, and the appearance,
    /// none of which is stored as data anywhere a tool can read.
    /// <para>
    /// Calling <c>Database.CharacterCreate</c> directly would require the harness to supply all of
    /// those, so a fixture would carry a copy of a decision the creator already makes. Driving the
    /// creator also leaves the tutorial disabled and the skillbar filled, exactly as it does for a
    /// player.
    /// </para>
    /// <para>
    /// The creator returns to character selection when it finishes. It does not enter the world,
    /// so world entry stays a separate step.
    /// </para>
    /// </remarks>
    public sealed class CharacterCreation
    {
        /// <summary>How long to wait for the creator's own coroutine to finish.</summary>
        private static readonly TimeSpan CreateTimeout = TimeSpan.FromSeconds(30);

        /// <summary>How long to wait for the creator to become available after the click.</summary>
        private static readonly TimeSpan OpenTimeout = TimeSpan.FromSeconds(10);

        /// <summary>Why a creation attempt was refused, or null when it succeeded.</summary>
        public sealed class Refusal
        {
            public Refusal(string code, string message)
            {
                Code = code;
                Message = message;
            }

            public string Code { get; }
            public string Message { get; }
        }

        public Refusal Failure { get; private set; }
        public bool Ok => Failure == null;

        /// <summary>Classes the creator offered for the requested race, as it presented them.</summary>
        public string[] ClassesOfferedForRace { get; private set; } = Array.Empty<string>();

        private static readonly string[] Classes =
            { "Warrior", "Ranger", "Cleric", "Rogue", "Wizard", "Druid" };

        /// <summary>
        /// Drives the creator to produce one character. Yields until the creator finishes or the
        /// attempt is refused. Inspect <see cref="Failure"/> afterwards.
        /// </summary>
        public IEnumerator Run(
            string characterName,
            string className,
            string race,
            string replaceCharacterName = null)
        {
            var selection = UICharacterSelection.singleton;
            if (selection == null)
            {
                Fail("creatorUnavailable",
                    "Character selection is not open. Create a character before entering the world.");
                yield break;
            }

            var requestedExists = Database.CharacterExists(characterName);
            var creationOffered = selection.createButton != null
                                  && selection.createButton.interactable;
            if (requestedExists || !creationOffered)
            {
                var held = Database.GetCharacters();
                var heldCount = held?.Count ?? 0;
                var replacementExists = false;
                for (var i = 0; i < heldCount; i++)
                {
                    if (string.Equals(
                            held[i], replaceCharacterName, StringComparison.OrdinalIgnoreCase))
                    {
                        replacementExists = true;
                        break;
                    }
                }

                var replacementBlocksCreation = requestedExists
                    ? string.Equals(
                        replaceCharacterName, characterName, StringComparison.OrdinalIgnoreCase)
                    : heldCount >= 8;

                if (replacementBlocksCreation
                    && !string.IsNullOrWhiteSpace(replaceCharacterName)
                    && replacementExists)
                {
                    Database.CharacterDelete(replaceCharacterName);
                    if (Database.CharacterExists(replaceCharacterName))
                    {
                        Fail("rosterCleanupFailed",
                            $"Deleting the earlier fixture character '{replaceCharacterName}' "
                            + "did not take effect.");
                        yield break;
                    }

                    Fail("rosterSlotFreed",
                        $"Deleted the earlier fixture character '{replaceCharacterName}'. "
                        + "Restart the game before retrying because character selection caches "
                        + "the roster it loaded.");
                    yield break;
                }

                if (requestedExists)
                {
                    Fail("characterExists", $"A character named '{characterName}' already exists.");
                    yield break;
                }

                var reason = heldCount < 8
                    ? "Restart the game because character selection is using a stale roster."
                    : "Name one character from an earlier fixture attempt to remove.";
                Fail("rosterFull",
                    $"The selection screen is not offering character creation. It holds "
                    + $"{heldCount} characters. {reason}");
                yield break;
            }

            selection.createButton.onClick.Invoke();

            // The creator's own component sets the singleton when its object becomes active, which
            // is not the same frame as the click. Waiting one frame happens to work and happens to
            // fail, so the wait is bounded rather than assumed.
            var openDeadline = DateTime.UtcNow + OpenTimeout;
            while (UICharacterEditor.singleton == null)
            {
                if (DateTime.UtcNow >= openDeadline)
                {
                    Fail("creatorUnavailable",
                        $"The character creator did not open within {OpenTimeout.TotalSeconds:0} seconds.");
                    yield break;
                }

                yield return null;
            }

            var editor = UICharacterEditor.singleton;

            // Selecting the race sets which classes the creator offers, so it comes first.
            if (!Invoke(editor, CreatorMethods.RaceMethod(race), out var raceError))
            {
                Fail("raceUnknown", raceError);
                yield break;
            }

            yield return null;

            ClassesOfferedForRace = OfferedClasses(editor);

            if (!TryGetButton(editor, className, out var classButton, out var buttonError))
            {
                Fail("classUnknown", buttonError);
                yield break;
            }

            if (!classButton.interactable)
            {
                Fail("racePairing",
                    $"The creator does not offer {className} to a {race}. It offers "
                    + $"{string.Join(", ", ClassesOfferedForRace)}.");
                yield break;
            }

            if (!Invoke(editor, CreatorMethods.ClassMethod(className), out var classError))
            {
                Fail("classUnknown", classError);
                yield break;
            }

            yield return null;

            editor.nameInput.text = characterName;
            if (editor.nameOverlayText != null)
                editor.nameOverlayText.text = characterName;

            // The creator validates the name, writes the character, and returns to selection.
            editor.createChar();

            var deadline = DateTime.UtcNow + CreateTimeout;
            while (!Database.CharacterExists(characterName))
            {
                // The creator validates the name itself and shows its own reason. Reading that
                // reason keeps the rules in one place: this step does not know what a legal name
                // is, only that the creator refused and what it said.
                var refusal = ShownError(editor);
                if (refusal != null)
                {
                    Fail("nameRefused", $"The creator refused the name '{characterName}': {refusal}");
                    yield break;
                }

                if (DateTime.UtcNow >= deadline)
                {
                    Fail("createTimedOut",
                        $"The creator did not produce '{characterName}' within "
                        + $"{CreateTimeout.TotalSeconds:0} seconds, and showed no reason.");
                    yield break;
                }

                yield return null;
            }
        }

        /// <summary>The message the creator is showing, or null when it shows none.</summary>
        private static string ShownError(UICharacterEditor editor)
        {
            var panel = editor.errorMessage;
            if (panel == null || !panel.activeSelf)
                return null;

            var text = editor.errorMessageText;
            var message = text == null ? null : text.text;
            return string.IsNullOrWhiteSpace(message) ? "no reason given" : message;
        }

        private static string[] OfferedClasses(UICharacterEditor editor)
        {
            var offered = new System.Collections.Generic.List<string>();
            foreach (var name in Classes)
            {
                if (TryGetButton(editor, name, out var button, out _) && button.interactable)
                    offered.Add(name);
            }

            return offered.ToArray();
        }

        private static bool TryGetButton(
            UICharacterEditor editor, string className, out Button button, out string error)
        {
            button = null;
            var memberName = CreatorMethods.ClassButtonField(className);

            // The interop layer exposes a game field as a property. A hand-written member stays a
            // field, so both are tried rather than assuming which one this is.
            const BindingFlags Public = BindingFlags.Public | BindingFlags.Instance;
            object value;
            var property = typeof(UICharacterEditor).GetProperty(memberName, Public);
            if (property != null)
            {
                value = property.GetValue(editor);
            }
            else
            {
                var field = typeof(UICharacterEditor).GetField(memberName, Public);
                if (field == null)
                {
                    error = $"The creator has no member '{memberName}', so '{className}' is not a class it offers.";
                    return false;
                }

                value = field.GetValue(editor);
            }

            button = value as Button;
            if (button == null)
            {
                error = $"The creator's '{memberName}' is not set.";
                return false;
            }

            error = null;
            return true;
        }

        private static bool Invoke(UICharacterEditor editor, string methodName, out string error)
        {
            var method = typeof(UICharacterEditor).GetMethod(
                methodName, BindingFlags.Public | BindingFlags.Instance);
            if (method == null)
            {
                error = $"The creator has no method '{methodName}'.";
                return false;
            }

            // `changeClassWarrior` and `changeRaceHuman` take an optional silent flag. The rest
            // take nothing, so the argument list follows the method the creator actually has.
            var arguments = method.GetParameters().Length == 0
                ? Array.Empty<object>()
                : new object[] { false };
            method.Invoke(editor, arguments);
            error = null;
            return true;
        }

        private void Fail(string code, string message) => Failure = new Refusal(code, message);
    }
}
