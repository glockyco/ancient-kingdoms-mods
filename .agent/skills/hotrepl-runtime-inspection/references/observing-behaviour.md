# Measuring live behaviour

A behaviour the source only implies needs a measurement. The obstacles are the agent's own latency
and the difficulty of holding a subject in the state under measurement.

## Contents

Before a measurement:

- Sample inside the game, not from the shell — and put the setup in the same coroutine.
- Prefer an event to a sample, and check that it can be subscribed to.
- Guard the setup of a job, because a dead coroutine answers nothing.
- Choose the subject before the method.

While it runs:

- Let the game drive a repeated action.
- Keep the subject alive and in place.
- Hold the fixture alive, and hold the subject engaged.
- Record absolute deadlines.

When it returns nothing, or a number to report:

- Take a screenshot before explaining an empty result.
- State the provenance of every number.
- Prefer a band from source to a mean.

## Sample inside the game, not from the shell

One `eval` for each sample costs seconds of round trip, and the agent's turn adds tens of seconds.
The game moves throughout. A subject wanders, a fixture dies, and the readings describe a situation
that has already ended.

Run the sampler as a coroutine inside the game instead. Keep the readings in a static list, then read
the list once when the run finishes.

```csharp
public class Probe { public static System.Collections.Generic.List<string> Lines = new(); }

System.Collections.IEnumerator Run(double seconds)
{
    var nm = Il2CppMirror.NetworkManager.singleton.TryCast<Il2Cpp.NetworkManagerMMO>();
    double started = Il2CppMirror.NetworkTime.time + nm.offsetNetworkTime;
    string lastKey = "";
    double nextTick = 0;

    while (true)
    {
        double t = Il2CppMirror.NetworkTime.time + nm.offsetNetworkTime;
        if (t - started > seconds) break;

        // Record on a change, plus one tick each second so gaps stay visible.
        string key = /* the fields that identify a transition */ "";
        if (key != lastKey || t >= nextTick)
        {
            lastKey = key;
            nextTick = t + 1.0;
            Probe.Lines.Add($"{t:0.000},...");
        }

        yield return null;
    }
}

MelonLoader.MelonCoroutines.Start(Run(90));
return "probe started";
```

Capture a screenshot from inside the probe when a moment of interest arrives. The capture completes at
the end of a frame, so read the file afterwards.

The setup belongs in the same coroutine as the measurement. A state established from the shell in one
call and used in the next has a turn of game time between them, which is long enough for the subject to
die, be teleported, lose its target or wander out of range. Establish the state and take the reading
without returning in between.

Assert the state every frame rather than once. The game undoes it: a warp lands the subject somewhere
hostile, death moves it to a town, and a flag set before the trip arrives after the damage. The loop
that worked reads like this, and the distance test is what makes it survive a death teleport.

```csharp
for (int f = 0; f < 180; f++)
{
    p.combat.Networkinvincible = true;
    if (p.state == "DEAD") p.CmdRespawn();
    if (UnityEngine.Vector2.Distance(p.transform.position, dest) > 3f)
    {
        p.movement.Reset();          // a respawn leaves a destination to walk to
        p.movement.Warp(dest);
    }
    yield return null;
}
```

Then survey, screenshot, and append one line to a static list. Read the list once at the end. Four
destinations measured this way cost one round trip; measured a call at a time they cost ten and produced
nothing, because the subject was dead for most of them.

## Take a screenshot before explaining an empty result

A reading of zero events has many causes and they look identical through scalars: the subject is dead,
it has no target, the target is out of range, the loop was never armed, or the thing being measured did
not happen. Guessing between them wastes a run each time.

One screenshot separates them. It carries the subject's health, its position, what is on screen around
it, the target frame, and the chat log, which narrates what the game did in the reader's own words. In
one capture the log read `You have entered Crescent Coast`, then a boss line, then `You have been slain`,
then `You have entered Milldenn` - a death and a town teleport that four separate scalar reads had not
revealed.

Take the screenshot first, then form the explanation. Delete a diagnostic capture afterwards; keep only
what a report cites. `'/Users/glockyco/src/github.com/glockyco/ancient-kingdoms-mods/.agent/skills/game-defect-reports'` holds the capture call and its two traps, a Windows
path and a frame to wait before the file exists.

## Prefer an event to a sample, and check that it can be subscribed to

A sample taken on a timer cannot measure a per-occurrence quantity. Two occurrences inside one
sampling gap are reported as one, and a gap with none invents an occurrence of zero. When the game
raises an event for the thing being measured, listen to it and read the state inside the callback.

Not every event can be listened to. The game is compiled ahead of time, so a generic instantiation
exists only where the game's own code needs it. Adding a listener to `UnityEvent<T0,T1>` constructs
`InvokableCall<T0,T1>`, and the game adds a listener to no two-argument event, so every one of them
throws `MissingMethodException` at `AddListener`. A single-argument event the game subscribes to
itself works.

Try both arities in one call, so the contrast is the evidence rather than one failure:

```csharp
var a = Il2CppInterop.Runtime.DelegateSupport.ConvertDelegate<UnityEngine.Events.UnityAction<Il2Cpp.Entity>>(
    new System.Action<Il2Cpp.Entity>((e) => { }));
p.combat.onDamageDealtTo.AddListener(a);          // works
```

When the event that carries the value cannot be subscribed to, listen to one that fires at the same
moment and read the value from the state. Confirm the ordering in the source first: a total read in a
callback is the occurrence's own value only if the engine advances it before it raises the event.

## Guard the setup of a job, because a dead coroutine answers nothing

A command that runs as a job starts a coroutine. An exception inside it ends the run without
completing the job, the job holds a concurrency slot for as long as the game runs, and every later
job is refused with `Maximum concurrent command jobs reached.` The failure looks like a broken
endpoint rather than a broken command.

A coroutine cannot catch around a `yield`, so do the fallible work in a method that does not yield
and have it report a failure instead of throwing. Setup is where this matters: subscribing, resolving
a type, and reaching a component all fail on their first call, before the loop.

Read `MelonLoader/Latest.log` when a job stops answering. An unhandled coroutine exception is logged
there with its stack, which names the line the job died on.

## Let the game drive a repeated action

A basic attack re-issues itself. One use of a skill that follows up with the default attack arms the
engine's own loop, and the loop keeps acting at the cadence the engine enforces. Sending the command
repeatedly does not measure that cadence, it competes with it, and the interval that comes back belongs
to the sender rather than the game.

Issue the action once, then read. A window with nothing acting in it is a window with an unarmed loop,
not a subject that cannot act.

The loop stops on its own in ways a reading has to account for:

- It is cleared when the subject has no attackable target, so a target that dies or despawns silently
  ends the window.
- Every reader of the loop flag also requires the target to be inside cast range, which for a melee
  skill is about one unit. A subject knocked back or walked away stops acting while still looking
  ready.

## Keep the subject alive and in place

A subject that dies stops measuring, and the state it leaves behind is not obvious:

- Restoring health does not clear the death state. The game's own respawn command does.
- A respawn sends the subject to its graveyard and gives it a destination to walk to, so warping it
  back is not enough. Clear the movement first, then warp, then re-arm the action.
- Invincibility set before a fight holds. Set after the subject is already being hit, it arrives too
  late; a subject placed next to a boss during a slow start-up can be dead before the first command.

Check the subject's state, its distance to the target and its loop flag together when a window returns
no events. Each of the three fails in a way that looks like the others.

## Record absolute deadlines

The game stores deadlines, not remaining times: `castTimeEnd`, `cooldownEnd`, and
`server-scripts/MonsterSkills.cs:nextSpecialCastTime` are all absolute server-corrected times. Record
the deadline rather than the difference. Coarse samples then reconstruct exact events, and a deadline
that moves between samples reveals a decision the game made without a visible action.

Read the clock as `NetworkTime.time` plus `NetworkManagerMMO.offsetNetworkTime`, which is the clock
every deadline uses.

## Hold the fixture alive

Set `server-scripts/Combat.cs:invincible` on the fixture from the process that runs the server.
`Combat.DealDamageAt` checks the victim's own flag, so the server's copy decides. A client cannot
grant itself the flag.

Zeroing `server-scripts/Combat.cs:baseDamage` on the attacker is weaker, because skill damage and
bonuses survive it.

## Hold the subject engaged

A monster fights only while several conditions hold at once. Check them in this order.

1. Damage fills the aggro list. `server-scripts/Monster.cs:OnAggro` only picks a target. When the
   fixture must not deal damage, write the aggro entry on the server.
2. `OnAggro` refuses every target while `server-scripts/Monster.cs:returningHomePoint` is true, which
   it becomes after the monster is dragged away from its spawn. Clear the field on the server.
3. A monster drops a target it cannot path to, through
   `server-scripts/Monster.cs:EventTargetUnreachable`. A respawn point is often unreachable, so put
   the fixture where the subject already walks.
4. A monster selects a skill only when it can reach its target. Out of reach it selects nothing and
   only pushes its own deadlines.
5. Do not warp a monster on every frame. A warp resets the navigation agent and holds the monster in
   `MOVING` forever. Warp once, then let it walk.

## Choose the subject before the method

Pick a subject that cannot kill the fixture and that the fixture cannot kill. A boss with a large
health pool and a low level satisfies both.

Read the subject's skills before you conclude that a cadence is broken. A cast can be impossible
rather than delayed: `server-scripts/MonsterSkills.cs:NextSkill` refuses a summon whose target is
closer than three yards, and it refuses any skill whose cast range excludes the target. The monster
then re-rolls its deadline, which looks like a stalled gate.

## State the provenance of every number

Say which figures you measured and which you derived from source. A derivation is a hypothesis until
a measurement agrees with it. When a measurement and the source disagree, trust the measurement and
find the branch that explains it.

A measurement also owes the reader the reason it can be trusted, in whatever terms fit it. An interval
says whether its subject settled before it was read. A target state says whether the engine's cleanup
pass could have run. A damage figure says which tier it reached and what held it there. These are
different questions and a shared wrapper over them would say less than each says on its own, but every
reading has one, and a reading that reports a number and no reason cannot be argued with.

## Prefer a band from source to a mean

A mean agreeing with a prediction is weak evidence, because a wrong model with the right mean passes it.
Where the engine's steps are known, derive the range one occurrence can fall in and check that every
occurrence falls inside it. A wrong model fails that.

Two independent readings of one occurrence are worth more than more samples of one reading. The amount
a caster asked for and the health a target lost come from different places, and the ratio between them
is a whole pipeline checked per hit rather than on an average.
