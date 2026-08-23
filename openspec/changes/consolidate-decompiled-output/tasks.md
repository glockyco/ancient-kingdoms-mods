## 1. Baseline

- [x] 1.1 Record the current directory sizes and file counts, the total on disk, and the output of `diff -rq server-scripts server-scripts-<newest>` so the duplication is measured rather than asserted.
      Measured 2026-08-23: `server-scripts` 5.1M/504, `-0.9.29.0` 5.1M/504, `-0.9.28.1` 5.2M/505,
      `-0.9.28.0` 5.2M/504, `-0.9.27.2` 5.2M/502. Total 26M.
      `diff -rq server-scripts server-scripts-0.9.29.0` produces no output, and the two are
      separate inodes rather than hard links, so the duplication is real.
- [x] 1.2 Record the number of `Source: server-scripts/` citations and the current result of `uv run compendium citations check`.
      525 `Source: server-scripts/` occurrences in the tracked sources. `citations check` reports
      474 ok, 46 symbol, 543 total, "All citations verified."
      (The 510 figure in the proposal predates this measurement.)
- [x] 1.3 Record the `SNAPSHOT.toml` contents of every existing tree, because those values become the store names.
      | tree | assembly_sha256 | steam_build_id |
      |---|---|---|
      | `server-scripts` | `5bcb73bc…` | `24771490` |
      | `-0.9.29.0` | `5bcb73bc…` | `24771490` |
      | `-0.9.28.1` | `ab047616…` | absent |
      | `-0.9.28.0` | no SNAPSHOT.toml | — |
      | `-0.9.27.2` | no SNAPSHOT.toml | — |
      The design assumed every tree could be named from its own file. Two cannot, and the facts
      are unrecoverable because those assemblies are gone. Resolved in tasks 2.2 and 3.3.

## 2. Decide retention

- [x] 2.1 State the retention limit and the reason for it. The workflow needs the previous tree for its diff step, so the floor is one.
      The limit is the current entry and one previous, which is the floor and is set at the floor.
      The update workflow diffs a new decompile against the one it replaces, so one previous is
      required. Nothing reads the one before that: a two-patch comparison is not a step in any
      workflow here, and the assembly needed to regenerate a pruned entry is gone once the
      installation moves on, so keeping a spare would preserve something nothing asks for.
- [x] 2.2 Record what the limit means for the trees that exist today, naming which are kept and which are pruned.
      Kept, as two entries for two distinct assemblies:
      - `5bcb73bc…` build `24771490`, currently held twice as `server-scripts` and
        `server-scripts-0.9.29.0`. One entry, and the pointer.
      - `ab047616…` build not recorded, currently `server-scripts-0.9.28.1`. The previous entry.
      Pruned: `server-scripts-0.9.28.0` and `server-scripts-0.9.27.2`, about 10.4 MB. Neither
      carries a `SNAPSHOT.toml`, so neither can be traced to the assembly that produced it, which
      is the property this store exists to provide. Both fall outside the retention limit in any
      case. Deleting them is not reversible: the assemblies are no longer obtainable.

## 3. Build the store

- [x] 3.1 Add a naming function that derives a store entry name from the recorded build identifier and the assembly digest, both of which the script already computes.
      `entry_name()` in `scripts/update-server-scripts.sh` produces
      `steam-<build id>-<first 12 of assembly sha256>`, matching the sibling project's shape.
- [x] 3.2 Move the current decompile into the store under that name, keeping `SNAPSHOT.toml` inside it.
      `.decompiled/steam-24771490-5bcb73bc8b3c`, moved rather than copied, `SNAPSHOT.toml` intact.
      Verified byte-identical to the working copy with `diff -rq` before the copy was removed.
- [x] 3.3 Move the retained previous trees into the store, deriving each name from its own `SNAPSHOT.toml`.
      One retained tree, `0.9.28.1`, moved to `.decompiled/steam-unknown-ab0476164ba6`. Its
      `SNAPSHOT.toml` records the digest but no `steam_build_id`, and the assembly it came from is
      gone, so the name states the absence instead of inventing a value or inferring one from
      Steam's log by timestamp. Task 5.3 makes the script refuse to produce such a name again.
- [x] 3.4 Replace `server-scripts/` with a pointer to the current entry.
      A relative symlink, `server-scripts -> .decompiled/steam-24771490-5bcb73bc8b3c`.
- [x] 3.5 Update `.gitignore` to cover the store and the pointer, and remove the entries that no longer describe anything.
      `.decompiled/` and `server-scripts` replace `server-scripts/` and `server-scripts-*/`.
      Confirmed with `git check-ignore` on the store, the pointer, and a file inside an entry.
      Note for task 5.3: `git check-ignore` refuses to traverse a symlink, so the destination
      check must name the store path rather than a path through the pointer.

## 4. Prove the pointer

- [x] 4.1 Confirm `uv run compendium citations check` reports the same result as task 1.2.
      474 ok, 46 symbol, 543 total, "All citations verified." Identical to the baseline.
- [x] 4.2 Confirm the tools that read the path work through the pointer: the citations commands, a recursive grep, and the `diff -b -rq` step the update workflow uses.
      `grep -rn` resolves through the pointer with and without a trailing slash and with
      `--include`. `diff -b -rq server-scripts .decompiled/steam-unknown-ab0476164ba6` reports 18
      changed files, which proves it followed the link and compared real trees. A cited region,
      `Combat.cs:680-682`, reads the expected source.
      `citations check` passes. `citations suggest` needed a repair, recorded in task 4.4.
- [x] 4.3 Confirm the total on disk fell by the size of one tree, compared against task 1.1.
      26M to 11M. Of the 15M, 5.1M is the duplicate this change removes and 10.4M is the two
      untraceable trees pruned under task 2.2. Deduplication alone accounts for one tree, as
      predicted.

- [x] 4.4 Repair `citations suggest`, which this change breaks. Not in the original plan: the
      proposal names `citations check` and `citations fix` as unchanged and does not mention
      `suggest`, which discovered archived snapshots by globbing `server-scripts-*` and labelling
      each from the version in its directory name. Both disappear with the old layout, so it
      would have found zero archives and said so without failing. It now reads the store, skips
      the entry the pointer resolves to because that is the current snapshot rather than an
      archive, orders entries by the build identifier in the name, and labels each from the
      `game_version` its `SNAPSHOT.toml` records. Exercised directly rather than through the
      command, which returns early when nothing is suspect: one archive found, labelled
      `0.9.28.1`, 503 files readable, current entry excluded.

## 5. Rewrite the script

- [x] 5.1 Write one tree per run instead of a working copy and a backup.
      The run decompiles into `.decompiled/.staging-<entry>` and renames it into place, so a
      failed run cannot leave a partial tree under a name claiming a complete decompile.
- [x] 5.2 Move the pointer to the new entry after the tree is complete, never before.
      `ln -sfn` runs after the rename. Until that line the citations resolve against the previous
      entry, so an aborted run leaves a working tree rather than a gap.
- [x] 5.3 Refuse to write when the destination is not ignored by version control, and name the destination in the failure.
      `assert_ignored` asks Git about the entry, the staging directory and the pointer.
      The first implementation checked the store directory instead and was wrong: a `dir/`
      pattern only matches a path Git can see is a directory, so on a fresh clone, where the
      store does not exist yet, it refused every first run. The A/B harness caught this because
      its store was absent; the real repository masked it. The check now names the paths that
      will actually be written.
      The build identifier became required in the same pass. It names the entry, and the previous
      code tolerated an unreadable manifest, which is how the retained `0.9.28.1` tree came to
      have no recorded build.
- [x] 5.4 Prune beyond the retention limit and report which trees were removed.
      `RETENTION=1`, applied to entries other than the one just written, ordered by the build
      identifier in the name with unnamed builds last.
- [x] 5.5 Keep the supplied version in `SNAPSHOT.toml` and stop using it in any path.
      `game_version` is written to the snapshot and appears in no path. The only remaining use of
      the argument is the staleness comparison, which is a comparison rather than a name.
- [x] 5.6 Confirm the staleness guard still compares the assembly digest against the recorded snapshot and still refuses an unpatched install.
      Exercised in the harness: claiming `0.9.31.0` while the install still carries the
      `0.9.30.0` assembly exits 1 and names the recorded version, the path, the digest and the
      build. `--force` still bypasses it. The guard reads `SNAPSHOT.toml` through the pointer, so
      it reads what the citations read.

## 6. Verification

- [x] 6.1 Run the script end to end against the current installation and confirm the produced tree is byte-identical to the entry it replaces, ignoring `SNAPSHOT.toml` timestamps.
      Performed as an A/B of the two scripts rather than as written, because as written it is no
      longer possible and would have done the wrong work. The installation has moved past the
      current entry: it now holds assembly `87c55eb7…` at build `24878482`, while the entry
      records `5bcb73bc…` at `24771490`. A run against the repository would therefore produce the
      0.9.30.0 decompile, which is the version update's step, not a reproduction, and it would
      have shifted every citation before the update was ready to account for it.
      The property the task protects is that the rewrite changed no produced bytes. That was
      tested directly: the previous script from `HEAD` and the rewritten one were each run
      against the same assembly, in separate scratch trees, sharing the pinned decompiler.
      `diff -rq` across the whole tree reports exactly two files:
      - `SNAPSHOT.toml`, differing only in `generated_at`;
      - `Assembly-CSharp.csproj`, differing only in the relative depth of its `HintPath` values,
        which the script's own header already documents as varying by output location.
      Every `.cs` file is byte-identical, 360 files on each side.
- [x] 6.2 Confirm exactly one tree exists per decompiled assembly and that no tree is a duplicate of another.
      Two entries for two distinct assemblies, `5bcb73bc…` and `ab047616…`, and the pointer is a
      symlink rather than a third copy. The name is derived from the digest, so a second entry
      for one assembly cannot be created: a repeat run resolves to the same entry.
- [x] 6.3 Confirm the destination check fires by pointing the script at a tracked path and observing the refusal.
      With the store removed from the harness `.gitignore`, the run exits 1, names
      `/tmp/ab-new/.decompiled/steam-24878482-87c55eb7cba9`, and leaves no staging directory.
- [x] 6.4 Confirm pruning fires and reports, by lowering the limit temporarily and restoring it.
      Tested at the shipped limit rather than a lowered one, by seeding three older entries. The
      run kept the current entry and `steam-24771490-…`, pruned `steam-24628084-…` and
      `steam-unknown-…`, named each as it went, and reported "Retained: 2 of 4 entries, pruned 2".
      Unknown builds sort last, so a tree whose build was never recorded is pruned before one
      that can be placed in the sequence.
- [x] 6.5 Run `openspec validate consolidate-decompiled-output --strict`.
      Valid.

## 7. Documentation

- [x] 7.1 Update the version-update skill so its diff step names the store and the pointer.
      Step 2 lists the store and reads the pointer to identify the current entry, then diffs the
      entry it replaced against `server-scripts`. The old form named two versioned directories,
      neither of which exists.
- [x] 7.2 Update any document that names a versioned directory path.
      Two outside the skill: the gitignore list in the same skill, and the citation rule in
      `website/CLAUDE.md`, which forbade pinning an archived snapshot directory and now names the
      store entry as the thing not to pin. A sweep for `server-scripts-<digit>` and "versioned
      backup" outside the change's own artifacts returns nothing.
      Left alone deliberately: `citations/parser.py` still accepts an optional version prefix on a
      citation. Touching the citation format is a stated non-goal, no citation uses the prefix
      (0 of 519), and such a citation still resolves because the parser strips it.
- [x] 7.3 Describe the layout in present tense, as the only layout.
      The script header carries a Layout section describing the store, the pointer, why the
      supplied version names nothing, and why retention is one. The skill describes the same
      arrangement without reference to what preceded it. A sweep of the changed documents for
      historical framing returns one hit, which is the rule forbidding it.
