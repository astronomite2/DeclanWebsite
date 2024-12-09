# Billiard Bash - Technical Specification

## Game Overview

Billiard Bash is a dynamic, physics-based arcade game where players navigate a circular arena, avoiding and interacting with enemies while managing health and score. The game features a unique ring-based movement system where players can strategically position themselves to regenerate health and avoid enemy collisions. The objective is to survive and destroy as many enemies as possible in an increasingly challenging environment.

## Configuration and Global Constants

### Game Configuration
- `config`: Phaser game configuration
  - **Inputs**: 
    - Type: `Phaser.AUTO`
    - Width: `800` pixels
    - Height: `600` pixels
    - Transparency: `true`
  - **Outputs**: Phaser game instance
  - **Behavior**: Establishes base game parameters and scene lifecycle methods

### Global Constants
- `CENTER_X`: `400` (horizontal center of the game area)
- `CENTER_Y`: `300` (vertical center of the game area)
- `OUTER_RADIUS`: `300` (radius of the game arena)
- `MAX_PLAYER_HITS`: `20` (maximum number of hits player can take)

## Game Mechanics

### Player Movement System
#### `handlePlayerMovement()`
- **Purpose**: Manage player movement based on keyboard input
- **Inputs**: 
  - Keyboard state (`cursors`)
  - `ACCELERATION`: `0.5`
  - `FRICTION`: `0.95`
- **Outputs**: Updated player velocity
- **Behaviors**:
  - Applies acceleration when directional keys are pressed
  - Applies friction when no keys are pressed
  - Constrains movement to keyboard input (W/A/S/D)

#### `updatePlayerVelocity(scene)`
- **Purpose**: Manage player velocity limits and create movement trail
- **Inputs**:
  - `MAX_SPEED`: `200`
  - Current player velocity
- **Outputs**: 
  - Constrained player velocity
  - Visual movement trail
- **Behaviors**:
  - Limits maximum player speed
  - Creates trail effect based on movement
  - Eliminates very small velocity values

#### `constrainPlayerPosition(scene)`
- **Purpose**: Keep player within game arena boundaries
- **Inputs**: 
  - Current player position
  - Arena boundary (`OUTER_RADIUS`)
- **Outputs**: 
  - Corrected player position
  - Reflected velocity
- **Behaviors**:
  - Prevents player from moving outside arena
  - Reflects velocity with energy loss when hitting boundary
  - Triggers player hit mechanics
  - Applies screen shake effect on strong collisions

### Enemy Spawn System
#### `spawnEnemy()`
- **Purpose**: Spawn enemies at arena boundaries
- **Inputs**:
  - `OUTER_RADIUS`
  - `ENEMY_SPAWN_INTERVAL`: `2000` milliseconds
- **Outputs**: Enemy game object
- **Behaviors**:
  - Randomly generates enemy at arena border
  - Sets initial enemy properties (velocity, hits, mass)

### Collision and Interaction
#### `handleCollision(obj1, obj2)`
- **Purpose**: Manage physics-based collision between game objects
- **Inputs**:
  - Two game objects
  - Object masses
- **Outputs**: Updated object velocities and positions
- **Behaviors**:
  - Calculates collision normal and relative velocity
  - Applies impulse-based collision resolution
  - Prevents object sticking
  - Limits extreme velocity changes

### Visual and Feedback Systems
#### `createTrail(scene, x, y, color, velocity, parentObject)`
- **Purpose**: Generate movement trail effect
- **Inputs**:
  - Current position
  - Movement velocity
  - Trail color
- **Outputs**: Temporary graphics object
- **Behaviors**:
  - Creates curved trail based on movement
  - Fades out trail over time

#### `generateCollisionParticles(scene, x, y)`
- **Purpose**: Create visual particle effect on collisions
- **Inputs**: Collision coordinates
- **Outputs**: Particle group
- **Behaviors**:
  - Generates geometric particles
  - Animates particles with random trajectories
  - Fades and destroys particles

#### `screenShake(scene, intensity)`
- **Purpose**: Create screen shake effect
- **Inputs**: Shake intensity
- **Outputs**: Camera movement
- **Behaviors**:
  - Applies temporary camera displacement
  - Provides visual feedback for significant events

## UI and Scoring
#### `createScoreUI(scene)`
- **Purpose**: Generate score display
- **Inputs**: Scene context
- **Outputs**: Text object
- **Behaviors**:
  - Creates stylized score text
  - Applies futuristic design elements

#### `updateScoreUI(scene, scoreText, enemiesDestroyed)`
- **Purpose**: Update and animate score display
- **Inputs**: 
  - Current score
  - Enemies destroyed count
- **Outputs**: Updated score text with animation
- **Behaviors**:
  - Updates score text
  - Applies brief scaling animation

## Health Management
#### `createHealthBar(scene)`
- **Purpose**: Generate health bar UI
- **Inputs**: Scene context
- **Outputs**: Health bar game objects
- **Behaviors**:
  - Creates background and foreground health bar
  - Sets initial health bar properties

#### `updateHealthBar(scene, healthBar, currentHits, maxHits)`
- **Purpose**: Manage and visualize player health
- **Inputs**:
  - Current hits
  - Maximum allowed hits
- **Outputs**: Updated health bar
- **Behaviors**:
  - Calculates health percentage
  - Adjusts bar width and color based on health status

# Game Mechanics Methods

## Enemy Management Methods

### `updateEnemy(scene, enemy)`

**Inputs**:
- `scene`: Current game scene
- `enemy`: Enemy game object

**Outputs**: Updated enemy position and velocity

**Behavior**:
- Calculates angle to player
- Applies acceleration towards player
- Applies friction to movement
- Limits enemy speed
- Updates enemy position
- Creates trail effect for moving enemies

### `constrainEnemyPosition(enemy)`

**Inputs**: 
- `enemy`: Enemy game object

**Outputs**: Constrained enemy position

**Behavior**:
- Checks enemy distance from arena center
- Repositions enemy if outside boundaries
- Applies bounce-back effect when hitting arena limits

# Game Over and UI Methods

## `createGameOverUI(scene, enemiesDestroyed)`

**Inputs**:
- `scene`: Current game scene
- `enemiesDestroyed`: Number of enemies killed

**Outputs**: Game over interface with leaderboard and buttons

**Behavior**:
- Creates fade-in blur overlay
- Generates game over container
- Displays score and leaderboard
- Adds interactive "Play Again" and "Main Menu" buttons
- Handles score submission to leaderboard

## `updateLeaderboard()`

**Inputs**: None (uses Firestore)

**Outputs**: Updated leaderboard UI

**Behavior**:
- Fetches top 25 scores from Firestore
- Populates leaderboard with color-coded entries
- Handles potential fetch errors

## `submitScore(playerName, score)`

**Inputs**:
- `playerName`: Player's name
- `score`: Number of enemies destroyed

**Outputs**: Score added to Firestore

**Behavior**:
- Adds score to leaderboard collection
- Triggers leaderboard update

# Collision Handling Methods

## `handleEnemyPlayerCollision(scene, enemy)`

**Inputs**:
- `scene`: Current game scene
- `enemy`: Enemy game object

**Outputs**: Collision effects and game state changes

**Behavior**:
- Checks collision between player and enemy
- Generates collision particles
- Applies elastic collision physics
- Tracks enemy hits
- Triggers player hit effects

## `handleEnemyEnemyCollision(enemy1, enemy2)`

**Inputs**:
- `enemy1`: First enemy game object
- `enemy2`: Second enemy game object

**Outputs**: Collision physics between enemies

**Behavior**:
- Checks collision between two enemies
- Applies elastic collision physics

# Game State Management Methods

## `resetGame(scene)`

**Inputs**: 
- `scene`: Current game scene

**Outputs**: Reinitialized game state

**Behavior**:
- Resets game variables
- Recreates player
- Clears existing enemies
- Restarts enemy spawner

## `playerHit(scene)`

**Inputs**: 
- `scene`: Current game scene

**Outputs**: Player damage and potential game over

**Behavior**:
- Increases player hit count
- Reduces player radius
- Increases player mass
- Triggers game over if max hits reached

# Main Update Method

## `update()`

**Inputs**: None (uses game scene context)

**Outputs**: Continuous game state updates

**Behavior**:
- Checks game over state
- Updates score UI
- Handles player movement
- Updates enemy positions
- Manages collisions
- Updates health bar
- Updates ring colors