namespace BossMod.Core.Catalog;

public enum ThreatTier { Low, Medium, High, Critical }
public enum BossKind { Boss, Elite, Fabled, WorldBoss }
public enum DamageType { Normal, Magic, Fire, Cold, Poison, Disease }
public enum AbilityDisplayPolicy { Auto, Always, Hidden }
public enum BossAbilityDensity { Compact, Expanded }

[System.Flags]
public enum DebuffKind
{
    None = 0,
    Stun = 1, Fear = 2, Blindness = 4, Mezz = 8,
    Poison = 16, Disease = 32, Fire = 64, Cold = 128,
}
