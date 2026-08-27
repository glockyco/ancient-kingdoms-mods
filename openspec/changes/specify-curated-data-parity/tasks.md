## 1. The reader and the comparison

- [x] 1.1 Read the class and race pairing from the character creator, one entry per race method, and
      report the classes each race enables
- [x] 1.2 Compare the published pairing against the read rule in both directions, reporting a missing
      value and an extra value separately for each entry
- [x] 1.3 Report a curated subject the game does not define, rather than skipping it
- [x] 1.4 Fail when the cited region yields no rule, so an empty parse cannot read as agreement
- [x] 1.5 Expose the comparison as `compendium classes check-races`, returning a non-zero exit code on
      disagreement
- [x] 1.6 Add hermetic tests for the reader and both comparison directions, supplying synthetic sources
      so the tests do not depend on a local snapshot

## 2. The citation

- [x] 2.1 Record the creator region the reader depends on as a source citation
- [x] 2.2 Anchor it in the citation ledger, and confirm the ledger check reports it as verified

## 3. Correcting the published value

- [x] 3.1 Correct `exported-data/classes.json` so every class lists the races the creator enables
- [x] 3.2 Remove the website's translation of the faction identifier into a race display name, so the
      published race names come from the corrected data
- [x] 3.3 Rebuild the database and confirm the check reports agreement for all six classes
- [x] 3.4 Confirm in a browser that the two corrected class pages list the races the game allows

## 4. Documentation

- [x] 4.1 Record the check in the per-version update procedure, in the phase that already reconciles
      citations, so a patch that moves the region is handled in one place
- [x] 4.2 State in the exporter policy that the class file is curated rather than exported, and name the
      command that guards it
- [ ] 4.3 Record the command in the pipeline's own guidance and in the repository command reference

## 5. Verification

- [x] 5.1 Run the pipeline tests, the citation check, and the race check
- [ ] 5.2 Run the agent documentation check after the documentation tasks
