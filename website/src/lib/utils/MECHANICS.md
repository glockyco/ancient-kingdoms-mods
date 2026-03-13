# Mechanics Card Reference

All cases handled by `skillMechanics.ts` and rendered in `+page.svelte`.
Each section maps every variant to a representative live URL and a brief note on what makes it distinct.

Base URL: `http://localhost:5173`

---

## Damage — `DamageFormulaKind`

Dispatch logic: `playerDamageFormula` / `mercDamageFormula` / `otherDamageFormula`.
Source: `TargetDamageSkill.cs`, `TargetProjectileSkill.cs`, `FrontalDamageSkill.cs`.

| Formula                 | Example URL                    | Notes                                                                                                                                                                                     |
| ----------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `normal`                | `/skills/parry`                | STR×1.0 + all equipment. Default for Warrior, Druid, Cleric melee skills.                                                                                                                 |
| `ranger_melee`          | `/skills/provoke`              | STR×1.0 + non-bow equipment. Ranger Normal-type melee subtracts the bow-slot bonus (TDS:218–221).                                                                                         |
| `rogue_melee`           | `/skills/ambush`               | STR×1.0 + main-hand + 50% off-hand + other equipment. Rogue off-hand reduction fires for all Rogue Normal-type melee (TDS:223–226).                                                       |
| `ranged_player`         | `/skills/archer_shot`          | STR×1.0 + bow + DEX×1.5 − melee-slot bonus. Ranger player `target_projectile` with Bow requirement.                                                                                       |
| `ranged_player_frontal` | `/skills/forest_guardians_aid` | STR×1.0 + DEX×1.5, no weapon subtraction. Ranger player `frontal_projectiles`; bow/melee adjustment does not apply.                                                                       |
| `ranged_merc`           | `/skills/explorer_shot`        | STR×1.0 + DEX×1.5. Ranger merc `target_projectile`; no bow/melee subtraction (merc path differs from player).                                                                             |
| `poison_rogue`          | `/skills/deadly_strike`        | STR×1.0 + main-hand + 50% off-hand + other equipment + DEX×2.5. Rogue Poison-type damage; DEX rate from `Dexterity.cs:94`.                                                                |
| `magic_spell`           | `/skills/mana_burn`            | INT×1.5 + equipment. All elemental/magic damage types (Magic/Fire/Cold/Disease) for players and mercs, regardless of `is_spell`.                                                          |
| `magic_weapon`          | `/skills/holy_wrath`           | INT×1.5 + STR×1.0 + full equipment. Non-spell Magic-type with a Weapon requirement; applies to Cleric (and non-Ranger mercs).                                                             |
| `magic_weapon_ranger`   | `/skills/wild_strike`          | INT×1.5 + magic equipment + STR×1.0 + non-bow equipment. Same as `magic_weapon` but Ranger subtracts the bow-slot bonus from the STR component.                                           |
| `manaburn`              | `/skills/rageblow`             | energy/mana × 2. Bypasses the entire mitigation pipeline — no resist chance, no block/miss.                                                                                               |
| `scroll`                | `/skills/fire_nova`            | PlayerLevel × 15. Scroll damage skills have no class restriction; fallback context added when `player_classes=[]`.                                                                        |
| `monster_melee`         | `/skills/ant_attack`           | baseDamage(level). Monsters, NPCs, non-merc companions — level-scaled, no STR/equipment contributions.                                                                                    |
| `monster_magic`         | `/skills/abyssal_orb`          | baseMagicDamage(level). Monster/NPC spells (`is_spell=1`, elemental damage type).                                                                                                         |
| weapon proc             | `/skills/blazefury`            | All 6 player classes enumerated so class-specific formulas (e.g. Rogue Poison) are captured. Procs always have `player_classes=[]` and fire via `weaponItem.procEffect.Apply(player, 1)`. |

---

## Heal — `HealBonusKind`

Dispatch logic: inline in `computeMechanicsSpec`, heal block.
Source: `TargetHealSkill.cs`, `Wisdom.cs`.

| Kind            | Example URL                 | Notes                                                                                                                |
| --------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `player_other`  | `/skills/healing`           | WIS × 0.004, cap 5.0 (500%). All non-Ranger players. Cap reached at WIS = 1250.                                      |
| `player_ranger` | `/skills/breeze`            | WIS × 3 × 0.004, cap 5.0 (500%). Ranger players only; cap reached at WIS = 417.                                      |
| `merc`          | `/skills/swift_bloom`       | pet.wisdom.GetHealBonus() — no ×3 multiplier even for Ranger merc (called without the `isRanger` flag).              |
| `none`          | `/skills/healing_circle`    | Bonus = 0. Monsters, NPCs, non-merc companions, familiars have no heal scaling.                                      |
| `scroll`        | `/skills/major_restoration` | Base Heal + PlayerLevel × 8. Scroll heal with no class restriction; fallback context added when `player_classes=[]`. |

---

## Buff — `BuffBonusAttrSource`

Dispatch logic: inline in `computeMechanicsSpec`, buff block.
Source: `TargetBuffSkill.cs:419`, `AreaBuffSkill.cs:25–47`.

| Source              | Example URL                 | Notes                                                                                                                        |
| ------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `player_wis`        | `/skills/inspiration`       | bonusAttribute = WIS. Non-Ranger target buff, or any area buff (area buffs never get the ×3 multiplier).                     |
| `player_ranger_wis` | `/skills/ancestral_spirits` | bonusAttribute = WIS × 3. Ranger player casting a target buff (not area).                                                    |
| `player_charisma`   | `/skills/leadership`        | bonusAttribute = CHA. Area buff with `is_mercenary_skill=1`; overrides WIS (AreaBuffSkill.cs:43–47).                         |
| `player_level`      | `/skills/staff_of_flowers`  | bonusAttribute = PlayerLevel × 8. Scroll buff; applies to all classes.                                                       |
| `merc_wis`          | `/skills/spirit_of_wolf`    | bonusAttribute = WIS (merc's own stats). Merc caster for any buff type; no ×3 regardless of merc class.                      |
| `none`              | —                           | bonusAttribute = 0. Shown only when a monster/companion casts alongside a player/merc; omitted for pure-monster buff skills. |

---

## Attack Timing — `TimingModel`

Only populated when `followup_default_attack=1` on the skill.
Source: `Player.cs:2783`, `Skills.cs:762–773`, `Monster.cs:1625`, `Npc.cs:1266`.

| Model          | Example URL             | Notes                                                                                                                                                                                                                                          |
| -------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `player_auto`  | `/skills/crush_strike`  | interval = cast_time + clamp(delay × (1 − haste) / 25, 0.25, 2.0). Player melee-weapon skill; refractory period applies when `required_weapon_category` is set and `is_spell=0`. Warrior and Rogue generate Rage here; other classes use Mana. |
| `player_skill` | `/skills/smite`         | interval = cast_time + cooldown. Player spell or non-weapon followup; cooldown is not haste-reduced.                                                                                                                                           |
| `merc_auto`    | `/skills/explorer_shot` | interval = cast_time + cooldown × (1 − haste). Merc non-spell with `followup_default_attack=1`.                                                                                                                                                |
| `merc_skill`   | `/skills/gale_burst`    | interval = cast_time + cooldown. Merc spell; cooldown is not haste-reduced.                                                                                                                                                                    |
| `monster`      | `/skills/blood_attack`  | interval = cast_time + cooldown × (1 − haste). Monsters and NPCs always haste-reduce via `FinishCastMeleeAttackMonster` regardless of `is_spell`.                                                                                              |

---

## Debuff — `DebuffBonusAttrKind`

Only computed when the skill has at least one non-zero scaled debuff field.
Dispatch logic: inline in `computeMechanicsSpec`, debuff block.
Source: `TargetDebuffSkill.cs:265–279`.

| Kind     | Example URL                     | Notes                                                                                             |
| -------- | ------------------------------- | ------------------------------------------------------------------------------------------------- |
| `int`    | `/skills/symbol_of_the_arbiter` | bonusAttribute = INT. Default for magic/elemental debuffs that are not melee, poison, or disease. |
| `str`    | `/skills/rangers_mark`          | bonusAttribute = STR. `is_melee_debuff=1` skills.                                                 |
| `dex`    | `/skills/cleanse`               | bonusAttribute = DEX. `is_poison_debuff=1` or `is_disease_debuff=1` skills.                       |
| `scroll` | `/skills/lethargy`              | bonusAttribute = PlayerLevel × 8. Scroll debuff.                                                  |
| `none`   | `/skills/ancient_curse`         | bonusAttribute = 0. Monsters, NPCs, non-merc companions — no attribute scaling for debuffs.       |
