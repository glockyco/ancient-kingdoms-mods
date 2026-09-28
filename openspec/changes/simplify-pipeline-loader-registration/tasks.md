## 1. Declare and validate datasets

- [ ] 1.1 Introduce a single ordered catalog for each load in `commands/build.py:82-123`, declaring file(s), model(s), output table(s), prerequisites, and simple/custom handler. Verify every loader-owned table has exactly one declared loader owner.
- [ ] 1.2 Validate duplicate IDs, duplicate output ownership, missing required inputs, and unknown or late prerequisites before loading. Verify each defect fails a focused database-loading test with its dataset name.

## 2. Migrate loader execution

- [ ] 2.1 Move one qualifying one-file, one-model, one-table dataset onto the common Pydantic/`insert_model` path, then migrate other qualifying datasets. Verify a valid record populates its table and an invalid row fails model validation.
- [ ] 2.2 Register class/static composition, junction producers, progression validation, and image/achievement publishers as custom handlers. Preserve `load_all` without `static_dir` for redaction inspection. Verify database rows match normal loading and no public image changes in inspection mode.
- [ ] 2.3 Remove manual build-order calls and the duplicate loader list in `loaders/__init__.py`. Replace source-call assertions in `test_registration.py` with behavioral ownership and prerequisite checks; verify an unregistered required table fails.

## 3. Exercise additions

- [ ] 3.1 In a scratch fixture, add one simple descriptor without a new loader function or manual build call. Verify its row appears once; verify a multi-input or derived dataset still uses an explicit custom handler.
- [ ] 3.2 Measure the edit sites for one simple and one complex dataset addition and update entity-addition guidance. Verify both measured workflows match the registered catalog.
