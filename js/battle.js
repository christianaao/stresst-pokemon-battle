/**
 * Battle Page JavaScript
 *
 * Handles the Pokemon battle gameplay, including attacks,
 * switching Pokemon, and battle flow.
 */

// ==========================================
// Game State
// ==========================================
const gameState = {
  round: 1,
  wins: 0,
  isLoading: true,
  isBattling: false,
  playerTeam: [
    { id: 1, name: "???", hp: 100, maxHp: 100, sprite: null },
    { id: 2, name: "???", hp: 100, maxHp: 100, sprite: null },
    { id: 3, name: "???", hp: 100, maxHp: 100, sprite: null },
  ],
  activePlayerPokemon: 0,
  enemyPokemon: { name: "???", hp: 100, maxHp: 100, sprite: null },
};

// ==========================================
// Battle Sequence
// ==========================================

/**
 * Runs the full battle sequence until one Pokemon faints.
 * Executes turn by turn with visual updates.
 */
async function runBattleSequence() {
  const playerPokemon = gameState.playerTeam[gameState.activePlayerPokemon];
  const enemyPokemon = gameState.enemyPokemon;

  gameState.isBattling = true;
  setButtonsEnabled(false);

  let turnCount = 0;
  const maxTurns = 50; // Safety limit

  // Battle continues until one Pokemon faints
  while (playerPokemon.hp > 0 && enemyPokemon.hp > 0 && turnCount < maxTurns) {
    turnCount++;

    // Determine who attacks first based on strength (with some randomness)
    const playerGoesFirst = determineTurnOrder(playerPokemon, enemyPokemon);

    if (playerGoesFirst) {
      // Player attacks first
      const playerResult = executeAttack(playerPokemon, enemyPokemon, true);
      await showAttackResult(playerResult);
      renderBattle();

      if (enemyPokemon.hp <= 0) break;

      await delay(800);

      // Enemy attacks
      const enemyResult = executeAttack(enemyPokemon, playerPokemon, false);
      await showAttackResult(enemyResult);
      renderBattle();
      saveTeam(gameState.playerTeam);
    } else {
      // Enemy attacks first
      const enemyResult = executeAttack(enemyPokemon, playerPokemon, false);
      await showAttackResult(enemyResult);
      renderBattle();
      saveTeam(gameState.playerTeam);

      if (playerPokemon.hp <= 0) break;

      await delay(800);

      // Player attacks
      const playerResult = executeAttack(playerPokemon, enemyPokemon, true);
      await showAttackResult(playerResult);
      renderBattle();
    }

    await delay(600);
  }

  // Battle ended - determine outcome
  await delay(500);

  if (enemyPokemon.hp <= 0) {
    await handleBattleWin();
  } else if (playerPokemon.hp <= 0) {
    await handlePokemonFainted();
  }

  gameState.isBattling = false;
}

/**
 * Displays the result of an attack with animation delay.
 * @param {Object} result - Attack result object
 */
async function showAttackResult(result) {
  let message = `${result.attacker} attacks ${result.defender} for ${result.damage} damage!`;

  if (result.effectivenessMsg) {
    message += ` ${result.effectivenessMsg}`;
  }

  if (result.defenderFainted) {
    message += ` ${result.defender} fainted!`;
  }

  showBattleMessage(message);
  await delay(1200);
}

/**
 * Handles winning a battle against the enemy.
 */
async function handleBattleWin() {
  gameState.wins++;
  gameState.round++;

  // Save battle progress
  saveBattleProgress({ round: gameState.round, wins: gameState.wins });

  // Record win and add coins
  recordBattleResult(true);
  addCoins(REWARDS.DEFEAT_POKEMON);

  const playerPokemon = gameState.playerTeam[gameState.activePlayerPokemon];
  showBattleMessage(
    `${playerPokemon.name} defeated ${gameState.enemyPokemon.name}! You earned ${REWARDS.WIN_BATTLE + REWARDS.DEFEAT_POKEMON} coins!`,
  );

  updateBattleUI();

  await delay(2000);

  // Fetch new enemy
  showBattleMessage("A new challenger approaches...");
  setButtonsEnabled(false);

  try {
    const newEnemy = await fetchRandomPokemon();
    gameState.enemyPokemon = newEnemy;
    saveEnemy(newEnemy);
    renderBattle();
    showBattleMessage(`A wild ${newEnemy.name} appeared! Ready to battle?`);
    setButtonsEnabled(true);
  } catch (error) {
    console.error("Failed to fetch new enemy:", error);
    showBattleMessage("Failed to find a new challenger. Please refresh.");
  }
}

/**
 * Handles when the player's active Pokemon faints.
 */
async function handlePokemonFainted() {
  const faintedPokemon = gameState.playerTeam[gameState.activePlayerPokemon];
  saveTeam(gameState.playerTeam);

  // Check if any Pokemon are still alive
  const alivePokemon = gameState.playerTeam.findIndex((p) => p.hp > 0);

  if (alivePokemon >= 0) {
    // Auto-switch to next available Pokemon
    gameState.activePlayerPokemon = alivePokemon;
    const nextPokemon = gameState.playerTeam[alivePokemon];

    showBattleMessage(
      `${faintedPokemon.name} fainted! Go, ${nextPokemon.name}!`,
    );
    renderBattle();

    await delay(1500);
    setButtonsEnabled(true);
    showBattleMessage(`${nextPokemon.name} is ready to battle!`);
  } else {
    // All Pokemon fainted - game over
    recordBattleResult(false);
    showBattleMessage(
      `All your Pokemon have fainted! Your streak of ${gameState.wins} wins has ended.`,
    );
    gameState.wins = 0;
    gameState.round = 1;

    // Reset battle progress
    resetBattleProgress();
    updateBattleUI();

    await delay(2000);
    showBattleMessage(
      "Visit the Team page to revive your Pokemon, or refresh for a new team.",
    );
  }
}

/**
 * Utility function for async delays.
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} Resolves after delay
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ==========================================
// DOM Elements
// ==========================================
const battleElements = {
  roundCounter: null,
  winCounter: null,
  battleMessage: null,
  playerTeam: null,
  playerPokemon: null,
  enemyPokemon: null,
  attackBtn: null,
  resetBtn: null,
  userBadge: null,
};

// ==========================================
// Initialization
// ==========================================

/**
 * Initializes the battle page.
 */
async function initBattle() {
  cacheBattleElements();
  loadUserData();
  setupBattleEventListeners();

  // Show loading state
  renderBattle();
  showBattleMessage("Assembling your team...");
  setButtonsEnabled(false);

  // Fetch Pokemon from API
  await loadPokemon();

  updateBattleUI();
  console.log("Pokemon Battle game initialized!");
}

/**
 * Loads Pokemon from the API for player team and enemy.
 * Uses saved team if available, otherwise fetches new team.
 */
async function loadPokemon() {
  try {
    // Check for existing saved team
    const savedTeam = loadTeam();
    let team;
    let isNewTeam = false;

    if (savedTeam && savedTeam.length === 3) {
      // Use saved team
      team = savedTeam;
      showBattleMessage("Loading your team...");
    } else {
      // Fetch new team
      isNewTeam = true;
      team = await fetchRandomTeam(3);
      // Save the new team
      saveTeam(team);
    }

    // Check for existing saved enemy, otherwise fetch new one
    let enemy = loadEnemy();
    let isNewEnemy = false;

    if (!enemy) {
      isNewEnemy = true;
      enemy = await fetchRandomPokemon();
      saveEnemy(enemy);
    }

    // Update game state
    gameState.playerTeam = team;
    gameState.enemyPokemon = enemy;
    gameState.isLoading = false;

    // Find first non-fainted Pokemon to be active
    const activeIndex = team.findIndex((p) => p.hp > 0);
    gameState.activePlayerPokemon = activeIndex >= 0 ? activeIndex : 0;

    // Re-render with real Pokemon
    renderBattle();
    setButtonsEnabled(true);

    // Show appropriate message
    if (isNewTeam) {
      const teamNames = team.map((p) => p.name).join(", ");
      showBattleMessage(
        `Your new team: ${teamNames}! Battle against ${enemy.name}!`,
      );
    } else {
      const activePokemon = team[gameState.activePlayerPokemon];
      showBattleMessage(
        `Go, ${activePokemon.name}! ${isNewEnemy ? "A wild" : "Your opponent"} ${enemy.name} ${isNewEnemy ? "appeared" : "awaits"}!`,
      );
    }

    console.log("Pokemon loaded:", { team, enemy, isNewTeam, isNewEnemy });
  } catch (error) {
    console.error("Failed to load Pokemon:", error);
    showBattleMessage("Failed to load Pokemon. Please refresh the page.");
    gameState.isLoading = false;
  }
}

/**
 * Caches frequently used DOM elements.
 */
function cacheBattleElements() {
  battleElements.roundCounter = document.getElementById("round-counter");
  battleElements.winCounter = document.getElementById("win-counter");
  battleElements.battleMessage = document.getElementById("battle-message");
  battleElements.playerTeam = document.getElementById("player-team");
  battleElements.playerPokemon = document.getElementById("player-pokemon");
  battleElements.enemyPokemon = document.getElementById("enemy-pokemon");
  battleElements.attackBtn = document.querySelector(".btn-attack");
  battleElements.resetBtn = document.getElementById("reset-btn");
  battleElements.userBadge = document.getElementById("user-badge");
}

/**
 * Sets up event listeners for battle interactions.
 */
function setupBattleEventListeners() {
  // Attack button
  battleElements.attackBtn.addEventListener("click", handleAttack);

  // Reset button
  battleElements.resetBtn.addEventListener("click", handleReset);

  // Team Pokemon cards (using event delegation)
  battleElements.playerTeam.addEventListener("click", (e) => {
    const card = e.target.closest(".pokemon-card");
    if (card && !gameState.isLoading) {
      const slot = parseInt(card.dataset.slot, 10);
      handlePokemonSelect(slot);
    }
  });
}

/**
 * Loads user profile data and updates the UI.
 */
function loadUserData() {
  // Update user badge in header using shared function
  renderUserBadge();

  // Load battle progress (round and wins)
  const progress = loadBattleProgress();
  gameState.round = progress.round;
  gameState.wins = progress.wins;
}

// ==========================================
// Event Handlers
// ==========================================

/**
 * Handles the attack action.
 * Initiates the battle sequence if not already battling.
 */
function handleAttack() {
  if (gameState.isLoading || gameState.isBattling) return;

  const playerPokemon = gameState.playerTeam[gameState.activePlayerPokemon];

  // Check if active Pokemon can battle
  if (playerPokemon.hp <= 0) {
    showBattleMessage(
      `${playerPokemon.name} has fainted! Select another Pokemon.`,
    );
    return;
  }

  // Check if all Pokemon are fainted
  const hasAlivePokemon = gameState.playerTeam.some((p) => p.hp > 0);
  if (!hasAlivePokemon) {
    showBattleMessage(
      "All your Pokemon have fainted! Visit the Team page to revive them.",
    );
    return;
  }

  // Start the battle sequence
  runBattleSequence();
}

/**
 * Handles selecting a Pokemon from the team.
 * @param {number} slot - The slot index of the selected Pokemon (0-2)
 */
function handlePokemonSelect(slot) {
  // Can't switch during battle
  if (gameState.isBattling) {
    showBattleMessage("Can't switch Pokemon during battle!");
    return;
  }

  const pokemon = gameState.playerTeam[slot];

  // Can't select fainted Pokemon
  if (pokemon.hp <= 0) {
    showBattleMessage(`${pokemon.name} has fainted and can't battle!`);
    return;
  }

  if (slot === gameState.activePlayerPokemon) {
    showBattleMessage(`${pokemon.name} is already in battle!`);
    return;
  }

  // Update active Pokemon
  const previousPokemon = gameState.playerTeam[gameState.activePlayerPokemon];
  gameState.activePlayerPokemon = slot;

  // Re-render battle to update active Pokemon in arena and team
  renderBattle();

  showBattleMessage(`Go, ${pokemon.name}! ${previousPokemon.name}, come back!`);
  console.log(`Switched from ${previousPokemon.name} to ${pokemon.name}`);
}

/**
 * Handles the reset/start again action.
 * Clears team, resets progress, and fetches new Pokemon.
 */
async function handleReset() {
  if (gameState.isBattling) {
    showBattleMessage("Can't reset during battle!");
    return;
  }

  // Confirm reset
  if (
    !confirm(
      "Are you sure you want to start again? This will reset your team and progress.",
    )
  ) {
    return;
  }

  // Reset game state
  gameState.round = 1;
  gameState.wins = 0;
  gameState.isLoading = true;
  gameState.activePlayerPokemon = 0;

  // Clear saved data
  clearTeam();
  clearEnemy();
  resetBattleProgress();

  // Update UI
  updateBattleUI();
  renderBattle();
  showBattleMessage("Starting fresh! Assembling a new team...");
  setButtonsEnabled(false);

  // Fetch new team and enemy
  try {
    const team = await fetchRandomTeam(3);
    const enemy = await fetchRandomPokemon();

    // Update game state
    gameState.playerTeam = team;
    gameState.enemyPokemon = enemy;
    gameState.isLoading = false;

    // Save new team
    saveTeam(team);

    // Re-render
    renderBattle();
    setButtonsEnabled(true);

    const teamNames = team.map((p) => p.name).join(", ");
    showBattleMessage(
      `New adventure begins! Your team: ${teamNames}. Battle against ${enemy.name}!`,
    );
  } catch (error) {
    console.error("Failed to reset game:", error);
    showBattleMessage("Failed to start new game. Please refresh the page.");
    gameState.isLoading = false;
  }
}

// ==========================================
// Rendering
// ==========================================

/**
 * Renders the entire battle scene (arena + team).
 */
function renderBattle() {
  renderBattleArena();
  renderTeam();
}

/**
 * Renders the battle arena with player and enemy Pokemon.
 */
function renderBattleArena() {
  const activePokemon = gameState.playerTeam[gameState.activePlayerPokemon];

  // Render player's active Pokemon using template
  battleElements.playerPokemon.innerHTML = createBattlePokemonCardTemplate(
    activePokemon,
    false,
    gameState.enemyPokemon,
  );

  // Render enemy Pokemon using template
  battleElements.enemyPokemon.innerHTML = createBattlePokemonCardTemplate(
    gameState.enemyPokemon,
    true,
    null,
  );
}

/**
 * Renders the player's team using template functions.
 */
function renderTeam() {
  if (gameState.isLoading) {
    // Show loading cards using template
    battleElements.playerTeam.innerHTML =
      createLoadingCardTemplate() +
      createLoadingCardTemplate() +
      createLoadingCardTemplate();
    return;
  }

  const teamHTML = gameState.playerTeam
    .map((pokemon, index) =>
      createPokemonCardTemplate(
        pokemon,
        index,
        index === gameState.activePlayerPokemon,
        gameState.enemyPokemon,
      ),
    )
    .join("");

  battleElements.playerTeam.innerHTML = teamHTML;
}

// ==========================================
// UI Updates
// ==========================================

/**
 * Updates all battle UI elements.
 */
function updateBattleUI() {
  battleElements.roundCounter.textContent = gameState.round;
  battleElements.winCounter.textContent = gameState.wins;
}

/**
 * Displays a message in the battle message box.
 * @param {string} message - The message to display
 */
function showBattleMessage(message) {
  battleElements.battleMessage.textContent = message;
}

/**
 * Enables or disables the action buttons.
 * @param {boolean} enabled - Whether buttons should be enabled
 */
function setButtonsEnabled(enabled) {
  battleElements.attackBtn.disabled = !enabled;

  if (enabled) {
    battleElements.attackBtn.classList.remove("disabled");
  } else {
    battleElements.attackBtn.classList.add("disabled");
  }
}

// ==========================================
// Start when DOM is ready
// ==========================================
document.addEventListener("DOMContentLoaded", initBattle);

// Add to stresst
