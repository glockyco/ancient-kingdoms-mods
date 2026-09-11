#nullable disable
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text.RegularExpressions;
using CombatVerification.Builds;
using CombatVerification.Capture;
using DataExporter;
using DataExporter.Exporters;
using DataExporter.Models;
using Il2Cpp;
using Newtonsoft.Json.Linq;
using UnityEngine;

namespace CharacterCapture
{
    public sealed class CharacterCaptureSnapshot
    {
        public JToken BuildData { get; set; }
        public Dictionary<string, string> Completeness { get; set; }
        public List<ContainerCapture> Containers { get; set; }
    }

    public static class CharacterStateReader
    {
        private static readonly string[] ClassIds =
        {
            "warrior", "ranger", "cleric", "rogue", "wizard", "druid",
        };

        public static CharacterCaptureSnapshot Read(Player player)
        {
            if (player == null) throw new ArgumentNullException(nameof(player));
            if (player.experience == null || player.skills == null || player.equipment == null)
                throw new InvalidOperationException("The local player has not loaded every required character component.");

            var containers = new List<ContainerCapture>
            {
                ReadContainer("player.equipment", player.equipment),
                ReadContainer("player.inventory", player.inventory),
                ReadContainer("player.bank", player.bank),
            };

            var companions = ReadCompanions(player, containers);
            var learnedBooks = ReadLearnedBooks(player);
            var rawAttributes = ReadRawAttributes(player);
            var baseProgression = ReadBaseProgression(player);
            var bookAttributes = ReadBookAttributes(player);
            var allocated = Subtract(rawAttributes, baseProgression, bookAttributes);
            EnsureNonNegative(allocated, "Allocated attributes cannot be derived from the captured runtime values.");

            var inventoryComplete = containers
                .Where(container => container.ContainerId is "player.inventory" or "player.bank")
                .All(container => container.State == "complete");
            var heldItems = new List<CapturedItem>();
            foreach (var container in containers)
            {
                if (container.ContainerId is "player.inventory" or "player.bank")
                    heldItems.AddRange(container.Items);
            }

            var logical = new LogicalBuildData
            {
                SchemaVersion = LogicalBuildAdapter.SchemaVersion,
                Player = new PlayerBuild
                {
                    EntityId = EntityId(player),
                    ClassId = GameIds.Sanitize(player.className),
                    RaceId = GameIds.Sanitize(player.raceName),
                    Level = player.level.current,
                    VeteranPoints = PlayerSkills(player).GetTotalVeteranPoints(),
                    Attributes = new AttributeLayers
                    {
                        RawObserved = rawAttributes,
                        BaseProgression = baseProgression,
                        Allocated = allocated,
                        DerivedObserved = ReadDerivedAttributes(player),
                    },
                    Skills = ReadSkills(player.skills),
                    Equipment = ReadEquipment(player.equipment),
                },
                Companions = companions,
                Consumables = inventoryComplete ? AggregateItems(heldItems, IsConsumable) : null,
                Ammunition = inventoryComplete ? AggregateItems(heldItems, item => item is AmmoItem) : null,
                LearnedBookIds = learnedBooks,
                Provenance = new BuildProvenance
                {
                    Kind = "capture",
                    Source = CaptureDocumentBuilder.ProducerId,
                },
            };

            var completeness = CompleteSections();
            if (!inventoryComplete)
            {
                completeness["consumables"] = "missing";
                completeness["ammunition"] = "missing";
            }

            var token = JObject.FromObject(logical);
            if (!inventoryComplete)
            {
                token.Remove("consumables");
                token.Remove("ammunition");
            }

            return new CharacterCaptureSnapshot
            {
                BuildData = token,
                Completeness = completeness,
                Containers = containers,
            };
        }

        public static CaptureGameDataIdentity ReadGameIdentity()
        {
            var gameRoot = Directory.GetParent(Application.dataPath)?.FullName
                ?? throw new InvalidOperationException("The game root directory is unavailable.");
            var assemblyPath = Path.Combine(
                gameRoot,
                "server",
                "server_Data",
                "Managed",
                "Assembly-CSharp.dll");
            if (!File.Exists(assemblyPath))
                throw new FileNotFoundException("The dedicated-server Assembly-CSharp.dll is unavailable.", assemblyPath);

            var steamApps = Directory.GetParent(gameRoot)?.Parent?.FullName;
            var manifestPath = steamApps == null
                ? null
                : Path.Combine(steamApps, "appmanifest_2241380.acf");
            if (manifestPath == null || !File.Exists(manifestPath))
                throw new FileNotFoundException("The Steam application manifest is unavailable.", manifestPath);

            var match = Regex.Match(File.ReadAllText(manifestPath), "\\\"buildid\\\"\\s+\\\"(?<id>[0-9]+)\\\"");
            if (!match.Success)
                throw new InvalidDataException("The Steam application manifest has no buildid.");

            return new CaptureGameDataIdentity
            {
                GameVersion = Application.version,
                SteamBuildId = match.Groups["id"].Value,
                AssemblySha256 = Sha256(assemblyPath),
            };
        }

        private static Dictionary<string, string> CompleteSections() => new(StringComparer.Ordinal)
        {
            ["player"] = "complete",
            ["player.attributes"] = "complete",
            ["player.skills"] = "complete",
            ["player.equipment"] = "complete",
            ["companions"] = "complete",
            ["consumables"] = "complete",
            ["ammunition"] = "complete",
            ["learnedBookIds"] = "complete",
        };

        private static ContainerCapture ReadContainer(string id, ItemContainer container)
        {
            if (container == null || container.slots == null || container.slots.Count == 0)
                return new ContainerCapture { ContainerId = id, State = "missing" };

            var result = new ContainerCapture { ContainerId = id, State = "complete" };
            for (var slotIndex = 0; slotIndex < container.slots.Count; slotIndex++)
            {
                var slot = container.slots[slotIndex];
                if (slot.amount <= 0)
                    continue;
                result.Items.Add(CapturedItem(id, slotIndex, slot));
            }
            return result;
        }

        private static CapturedItem CapturedItem(string containerId, int slotIndex, ItemSlot slot)
        {
            var data = slot.item.data
                ?? throw new InvalidOperationException($"{containerId} slot {slotIndex} has no item asset.");
            return new CapturedItem
            {
                InstanceId = $"{containerId}:{slotIndex}",
                ItemId = GameIds.Sanitize(data.name),
                ItemName = data.nameItem,
                Quantity = slot.amount,
                ContainerId = containerId,
                Slot = slotIndex,
                AugmentId = ResolveAugmentId(slot.augmentName),
                Durability = data is EquipmentItem ? slot.durability : null,
            };
        }

        private static string ResolveAugmentId(string augmentName)
        {
            if (string.IsNullOrEmpty(augmentName))
                return null;
            if (!GameManager.cacheItems.TryGetValue(augmentName.GetStableHashCode(), out var asset) || asset == null)
                throw new InvalidOperationException($"Augment '{augmentName}' has no runtime asset.");
            return GameIds.Sanitize(asset.name);
        }

        private static List<EquippedItem> ReadEquipment(Equipment equipment)
        {
            var items = new List<EquippedItem>();
            for (var slotIndex = 0; slotIndex < equipment.slots.Count; slotIndex++)
            {
                var slot = equipment.slots[slotIndex];
                if (slot.amount <= 0)
                    continue;
                var data = slot.item.data
                    ?? throw new InvalidOperationException($"Equipment slot {slotIndex} has no item asset.");
                items.Add(new EquippedItem
                {
                    Slot = slotIndex,
                    ItemId = GameIds.Sanitize(data.name),
                    ItemName = data.nameItem,
                    AugmentId = ResolveAugmentId(slot.augmentName),
                    Durability = slot.durability,
                    Amount = slot.amount,
                });
            }
            return items;
        }

        private static List<AllocatedSkill> ReadSkills(Skills skills)
        {
            var captured = new List<AllocatedSkill>();
            var byId = new Dictionary<string, AllocatedSkill>(StringComparer.Ordinal);
            foreach (var skill in skills.skills)
            {
                if (skill.baseLevel <= 0)
                    continue;
                var current = new AllocatedSkill
                {
                    SkillId = GameIds.Sanitize(skill.data.name),
                    SkillName = skill.name,
                    Level = skill.baseLevel,
                    Pool = skill.data.isVeteran ? "veteran" : "normal",
                };
                if (byId.TryGetValue(current.SkillId, out var prior))
                {
                    // Some class templates expose the same catalog skill in more than one runtime
                    // slot. One logical identity represents identical slots; conflicting values are
                    // not safe to collapse.
                    if (prior.Level != current.Level || prior.Pool != current.Pool)
                        throw new InvalidOperationException(
                            $"Skill '{current.SkillId}' has conflicting runtime slots.");
                    continue;
                }
                byId.Add(current.SkillId, current);
                captured.Add(current);
            }
            return captured;
        }

        private static List<string> ReadLearnedBooks(Player player)
        {
            var books = new List<string>();
            foreach (var learnedName in player.books)
            {
                if (!GameManager.cacheItems.TryGetValue(learnedName.GetStableHashCode(), out var asset) || asset == null)
                    throw new InvalidOperationException($"Learned book '{learnedName}' has no runtime asset.");
                if (asset is not BookItem)
                    throw new InvalidOperationException($"Learned book '{learnedName}' does not resolve to a book asset.");
                books.Add(GameIds.Sanitize(asset.name));
            }
            return books;
        }

        private static AttributeValues ReadBaseProgression(Player player)
        {
            var classId = GameIds.Sanitize(player.className);
            var raceId = GameIds.Sanitize(player.raceName);
            var rows = ProgressionRows.Create(player.level.max, Experience.maxVeteranLevel, ClassIds);
            var race = rows.races.SingleOrDefault(row => row.id == raceId)
                ?? throw new InvalidOperationException($"Race '{raceId}' has no progression row.");
            var level = rows.class_levels.SingleOrDefault(row => row.class_id == classId && row.level == player.level.current)
                ?? throw new InvalidOperationException($"Class '{classId}' level {player.level.current} has no progression row.");
            return Add(ToAttributes(race.starting_attributes), ToAttributes(level.automatic_attributes));
        }

        private static AttributeValues ReadBookAttributes(Player player)
        {
            var values = new AttributeValues();
            foreach (var learnedName in player.books)
            {
                if (!GameManager.cacheItems.TryGetValue(learnedName.GetStableHashCode(), out var asset) || asset is not BookItem book)
                    throw new InvalidOperationException($"Learned book '{learnedName}' has no book asset.");
                values.Strength += book.strengthGain;
                values.Constitution += book.constitutionGain;
                values.Dexterity += book.dexterityGain;
                values.Intelligence += book.intelligenceGain;
                values.Wisdom += book.wisdomGain;
                values.Charisma += book.charismaGain;
            }
            return values;
        }

        private static AttributeValues ReadDerivedAttributes(Player player) => new()
        {
            Strength = player.strength.value,
            Constitution = player.constitution.value,
            Dexterity = player.dexterity.value,
            Intelligence = player.intelligence.value,
            Wisdom = player.wisdom.value,
            Charisma = player.charisma.value,
        };

        private static AttributeValues ReadRawAttributes(Player player)
        {
            var derived = ReadDerivedAttributes(player);
            var equipment = player.equipment;
            var skills = player.skills;
            var playerEquipment = equipment.TryCast<PlayerEquipment>()
                ?? throw new InvalidOperationException(
                    "The local player's equipment component is not PlayerEquipment.");
            var set = playerEquipment.GetArmorSetAttributesBonus();
            return new AttributeValues
            {
                Strength = derived.Strength - equipment.GetStrengthBonus() - set.strength - skills.GetStrengthBonus(),
                Constitution = derived.Constitution - equipment.GetConstitutionBonus() - set.constitution - skills.GetConstitutionBonus(),
                Dexterity = derived.Dexterity - equipment.GetDexterityBonus() - set.dexterity - skills.GetDexterityBonus(),
                Intelligence = derived.Intelligence - equipment.GetIntelligenceBonus() - set.intelligence - skills.GetIntelligenceBonus(),
                Wisdom = derived.Wisdom - equipment.GetWisdomBonus() - set.wisdom - skills.GetWisdomBonus(),
                Charisma = derived.Charisma - equipment.GetCharismaBonus() - set.charisma - skills.GetCharismaBonus(),
            };
        }

        private static List<CompanionBuild> ReadCompanions(Player player, List<ContainerCapture> containers)
        {
            var result = new List<CompanionBuild>();
            AddCompanion(result, containers, player.activePet, "pet", 1);
            AddCompanion(result, containers, player.activeMercenary, "mercenary", 1);
            AddCompanion(result, containers, player.activeMercenary2, "mercenary", 2);
            AddCompanion(result, containers, player.activeMercenary3, "mercenary", 3);
            AddCompanion(result, containers, player.activeMercenary4, "mercenary", 4);
            return result;
        }

        private static void AddCompanion(
            List<CompanionBuild> result,
            List<ContainerCapture> containers,
            Pet pet,
            string kind,
            int ordinal)
        {
            if (pet == null)
                return;
            var entityId = EntityId(pet);
            var containerId = $"{kind}.{ordinal}.equipment";
            containers.Add(ReadContainer(containerId, pet.equipment));
            var usesEnergy = pet.typeMonster is "Warrior" or "Rogue";
            result.Add(new CompanionBuild
            {
                EntityId = entityId,
                Kind = kind,
                ArchetypeId = GameIds.Sanitize(pet.typeMonster),
                RaceId = GameIds.Sanitize(pet.raceName),
                Level = pet.level.current,
                HealthMultiplier = pet.health?.multiplierHealth,
                ResourceMultiplier = usesEnergy ? pet.energy?.multiplierEnergy : pet.mana?.multiplierMana,
                BaseCombat = pet.combat?.baseDamage.baseValue,
                CurrentResources = new CompanionResources
                {
                    Health = Resource(pet.health),
                    Mana = pet.mana == null ? null : Resource(pet.mana),
                    Energy = pet.energy == null ? null : Resource(pet.energy),
                },
                Effects = ReadEffects(pet.skills, entityId),
                Skills = ReadSkills(pet.skills),
                Equipment = ReadEquipment(pet.equipment),
            });
        }

        private static ResourceValue Resource(EnergyResource resource) => new()
        {
            Current = resource.current,
            Max = resource.max,
        };

        private static List<CapturedEffect> ReadEffects(Skills skills, string recipientId)
        {
            var effects = new List<CapturedEffect>();
            foreach (var buff in skills.buffs)
            {
                effects.Add(new CapturedEffect
                {
                    SkillId = GameIds.Sanitize(buff.data.name),
                    SkillName = buff.name,
                    Level = buff.level,
                    SourceEntityId = buff.damageSourceNetId == 0 ? null : buff.damageSourceNetId.ToString(),
                    RecipientEntityId = recipientId,
                    ExpiresAtServerTime = buff.buffTimeEnd,
                });
            }
            return effects;
        }

        private static List<ItemQuantity> AggregateItems(
            IEnumerable<CapturedItem> captured,
            Func<ScriptableItem, bool> predicate)
        {
            return captured
                .Select(item => new { Item = item, Asset = ResolveItem(item.ItemName) })
                .Where(value => predicate(value.Asset))
                .GroupBy(value => value.Item.ItemId, StringComparer.Ordinal)
                .Select(group => new ItemQuantity
                {
                    ItemId = group.Key,
                    ItemName = group.Select(value => value.Item.ItemName).FirstOrDefault(),
                    Quantity = group.Sum(value => value.Item.Quantity),
                })
                .OrderBy(item => item.ItemId, StringComparer.Ordinal)
                .ToList();
        }

        private static ScriptableItem ResolveItem(string itemName)
        {
            if (!GameManager.cacheItems.TryGetValue(itemName.GetStableHashCode(), out var asset) || asset == null)
                throw new InvalidOperationException($"Item '{itemName}' has no runtime asset.");
            return asset;
        }

        private static bool IsConsumable(ScriptableItem item) =>
            item is FoodItem or PotionItem or ScrollItem;

        private static string EntityId(Entity entity) => entity.netId.ToString();

        private static PlayerSkills PlayerSkills(Player player) =>
            player.skills?.TryCast<PlayerSkills>()
            ?? throw new InvalidOperationException(
                "The local player's skills component is not PlayerSkills.");

        private static AttributeValues ToAttributes(AttributeValuesData value) => new()
        {
            Strength = value.strength,
            Constitution = value.constitution,
            Dexterity = value.dexterity,
            Intelligence = value.intelligence,
            Wisdom = value.wisdom,
            Charisma = value.charisma,
        };

        private static AttributeValues Add(AttributeValues left, AttributeValues right) => new()
        {
            Strength = left.Strength + right.Strength,
            Constitution = left.Constitution + right.Constitution,
            Dexterity = left.Dexterity + right.Dexterity,
            Intelligence = left.Intelligence + right.Intelligence,
            Wisdom = left.Wisdom + right.Wisdom,
            Charisma = left.Charisma + right.Charisma,
        };

        private static AttributeValues Subtract(AttributeValues total, AttributeValues first, AttributeValues second) => new()
        {
            Strength = total.Strength - first.Strength - second.Strength,
            Constitution = total.Constitution - first.Constitution - second.Constitution,
            Dexterity = total.Dexterity - first.Dexterity - second.Dexterity,
            Intelligence = total.Intelligence - first.Intelligence - second.Intelligence,
            Wisdom = total.Wisdom - first.Wisdom - second.Wisdom,
            Charisma = total.Charisma - first.Charisma - second.Charisma,
        };

        private static void EnsureNonNegative(AttributeValues value, string message)
        {
            if (value.Strength < 0 || value.Constitution < 0 || value.Dexterity < 0 ||
                value.Intelligence < 0 || value.Wisdom < 0 || value.Charisma < 0)
                throw new InvalidOperationException(message);
        }

        private static string Sha256(string path)
        {
            using var sha = SHA256.Create();
            using var stream = File.OpenRead(path);
            return BitConverter.ToString(sha.ComputeHash(stream)).Replace("-", "").ToLowerInvariant();
        }
    }
}
