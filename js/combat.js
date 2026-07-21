/**
 * Combat System
 *
 * Handles type effectiveness, damage calculation, and attack execution.
 * This is the core battle logic separate from UI concerns.
 */

// ==========================================
// Type Effectiveness Chart
// ==========================================
/**
 * Type effectiveness multipliers.
 * Format: { attackingType: { defendingType: multiplier } }
 * 2.0 = super effective, 0.5 = not very effective, 0 = no effect
 */
const TYPE_EFFECTIVENESS = {
  normal: { rock: 0.5, ghost: 0, steel: 0.5 },
  fire: {
    fire: 0.5,
    water: 0.5,
    grass: 2,
    ice: 2,
    bug: 2,
    rock: 0.5,
    dragon: 0.5,
    steel: 2,
  },
  water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  electric: {
    water: 2,
    electric: 0.5,
    grass: 0.5,
    ground: 0,
    flying: 2,
    dragon: 0.5,
  },
  grass: {
    fire: 0.5,
    water: 2,
    grass: 0.5,
    poison: 0.5,
    ground: 2,
    flying: 0.5,
    bug: 0.5,
    rock: 2,
    dragon: 0.5,
    steel: 0.5,
  },
  ice: {
    fire: 0.5,
    water: 0.5,
    grass: 2,
    ice: 0.5,
    ground: 2,
    flying: 2,
    dragon: 2,
    steel: 0.5,
  },
  fighting: {
    normal: 2,
    ice: 2,
    poison: 0.5,
    flying: 0.5,
    psychic: 0.5,
    bug: 0.5,
    rock: 2,
    ghost: 0,
    dark: 2,
    steel: 2,
    fairy: 0.5,
  },
  poison: {
    grass: 2,
    poison: 0.5,
    ground: 0.5,
    rock: 0.5,
    ghost: 0.5,
    steel: 0,
    fairy: 2,
  },
  ground: {
    fire: 2,
    electric: 2,
    grass: 0.5,
    poison: 2,
    flying: 0,
    bug: 0.5,
    rock: 2,
    steel: 2,
  },
  flying: {
    electric: 0.5,
    grass: 2,
    fighting: 2,
    bug: 2,
    rock: 0.5,
    steel: 0.5,
  },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug: {
    fire: 0.5,
    grass: 2,
    fighting: 0.5,
    poison: 0.5,
    flying: 0.5,
    psychic: 2,
    ghost: 0.5,
    dark: 2,
    steel: 0.5,
    fairy: 0.5,
  },
  rock: {
    fire: 2,
    ice: 2,
    fighting: 0.5,
    ground: 0.5,
    flying: 2,
    bug: 2,
    steel: 0.5,
  },
  ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon: { dragon: 2, steel: 0.5, fairy: 0 },
  dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
  steel: {
    fire: 0.5,
    water: 0.5,
    electric: 0.5,
    ice: 2,
    rock: 2,
    steel: 0.5,
    fairy: 2,
  },
  fairy: {
    fire: 0.5,
    fighting: 2,
    poison: 0.5,
    dragon: 2,
    dark: 2,
    steel: 0.5,
  },
};

// ==========================================
// Type Effectiveness Functions
// ==========================================

/**
 * Gets the type effectiveness multiplier for an attack.
 * @param {string[]} attackerTypes - Types of the attacking Pokemon
 * @param {string[]} defenderTypes - Types of the defending Pokemon
 * @returns {number} Combined effectiveness multiplier
 */
function getTypeEffectiveness(attackerTypes, defenderTypes) {
  let multiplier = 1;

  // Use first type as primary attacking type
  const attackType = attackerTypes[0];
  if (!attackType) return 1;

  const effectiveness = TYPE_EFFECTIVENESS[attackType] || {};

  // Check against all defender types
  for (const defType of defenderTypes) {
    if (effectiveness[defType] !== undefined) {
      multiplier *= effectiveness[defType];
    }
  }

  return multiplier;
}

/**
 * Gets the battle message for type effectiveness.
 * @param {number} typeMultiplier - The effectiveness multiplier
 * @returns {string} Battle message describing effectiveness (or empty string if neutral)
 */
function getEffectivenessDescription(typeMultiplier) {
  if (typeMultiplier === 0) return "It has no effect...";
  if (typeMultiplier >= 2) return "It's super effective!";
  if (typeMultiplier < 1 && typeMultiplier > 0)
    return "It's not very effective...";
  return "";
}

// ==========================================
// Damage Calculation
// ==========================================

/**
 * Calculates damage for an attack.
 * Considers attack stat, strength, type effectiveness, and randomization.
 * @param {Object} attacker - The attacking Pokemon
 * @param {Object} defender - The defending Pokemon
 * @returns {Object} Damage result with amount and effectiveness message
 */
function calculateDamage(attacker, defender) {
  // Base damage from attack stat (scaled down for gameplay)
  const baseAttack = attacker.attack || 50;

  // Strength multiplier (1-100 scaled to 0.8-1.5)
  const strengthMultiplier = 0.8 + ((attacker.strength || 50) / 100) * 0.7;

  // Type effectiveness
  const attackerTypes = attacker.types || ["normal"];
  const defenderTypes = defender.types || ["normal"];
  const typeMultiplier = getTypeEffectiveness(attackerTypes, defenderTypes);

  // Random factor (0.85 to 1.15)
  const randomFactor = 0.85 + Math.random() * 0.3;

  // Critical hit chance (10%)
  const isCritical = Math.random() < 0.1;
  const critMultiplier = isCritical ? 1.5 : 1;

  // Calculate final damage
  let damage = Math.round(
    baseAttack *
      0.4 *
      strengthMultiplier *
      typeMultiplier *
      randomFactor *
      critMultiplier,
  );

  // Minimum damage of 1 (unless immune)
  if (typeMultiplier === 0) {
    damage = 0;
  } else {
    damage = Math.max(1, damage);
  }

  // Determine effectiveness message using shared function
  let effectivenessMsg = getEffectivenessDescription(typeMultiplier);

  if (isCritical && damage > 0) {
    effectivenessMsg = "Critical hit! " + effectivenessMsg;
  }

  return {
    damage,
    effectivenessMsg,
    typeMultiplier,
    isCritical,
    strengthMultiplier,
    randomFactor,
  };
}

// ==========================================
// Attack Execution
// ==========================================

/**
 * Executes a single attack turn.
 * @param {Object} attacker - The attacking Pokemon
 * @param {Object} defender - The defending Pokemon
 * @param {boolean} isPlayerAttack - Whether this is the player's attack
 * @returns {Object} Result with damage dealt and messages
 */
function executeAttack(attacker, defender, isPlayerAttack) {
  const result = calculateDamage(attacker, defender);

  // Apply damage
  defender.hp = Math.max(0, defender.hp - result.damage);

  return {
    attacker: attacker.name,
    defender: defender.name,
    damage: result.damage,
    effectivenessMsg: result.effectivenessMsg,
    defenderFainted: defender.hp <= 0,
    isPlayerAttack,
    isCritical: result.isCritical,
    typeMultiplier: result.typeMultiplier,
  };
}

/**
 * Determines turn order based on Pokemon strength with randomization.
 * @param {Object} pokemon1 - First Pokemon
 * @param {Object} pokemon2 - Second Pokemon
 * @returns {boolean} True if pokemon1 goes first
 */
function determineTurnOrder(pokemon1, pokemon2) {
  const speed1 = (pokemon1.strength || 50) + Math.random() * 20;
  const speed2 = (pokemon2.strength || 50) + Math.random() * 20;
  return speed1 >= speed2;
}

// ==========================================
// Export for module usage (if needed later)
// ==========================================
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    TYPE_EFFECTIVENESS,
    getTypeEffectiveness,
    getEffectivenessDescription,
    calculateDamage,
    executeAttack,
    determineTurnOrder,
  };
}

// Add to stresst
