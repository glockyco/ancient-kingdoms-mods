# Measuring live behaviour

A behaviour the source only implies needs a measurement. The obstacles are the agent's own latency
and the difficulty of holding a subject in the state under measurement.

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
