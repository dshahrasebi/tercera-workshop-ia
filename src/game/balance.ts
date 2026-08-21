// Token economy + tuning knobs. One place to balance the whole demo.
// ponytail: hand-tuned demo numbers; Phase 1 balances against playtest data.
export const GAME_W = 960;
export const GAME_H = 640;

export const PLAYER_SPEED = 200;
export const PLAYER_MAX_HEARTS = 5;
export const PLAYER_IFRAMES_MS = 850;
export const ATTACK_COOLDOWN_MS = 320;

export const START_TOKENS = 150;

export const ENEMY_HP = 26;
export const ENEMY_SPEED = 62;
export const ENEMY_TOUCH_DAMAGE = 1;
export const ENEMY_COUNT = 3;
export const ENEMY_KILL_REWARD = 45;

// Guardians wind up and lunge so they feel like they're hunting you, not drifting.
export const ENEMY_LUNGE_RANGE = 250;
export const ENEMY_LUNGE_INTERVAL_MS = 2600;
export const ENEMY_LUNGE_TELEGRAPH_MS = 420;
export const ENEMY_LUNGE_SPEED = 250;
export const ENEMY_LUNGE_DURATION_MS = 300;

// Dash/dodge: a short i-frame burst so combat has an out and a rhythm.
export const DASH_SPEED = 540;
export const DASH_DURATION_MS = 160;
export const DASH_COOLDOWN_MS = 700;
export const DASH_IFRAMES_MS = 240;

// Kill streaks: reward aggressive, efficient clears with bonus tokens.
export const COMBO_WINDOW_MS = 3500;
export const COMBO_BONUS_TOKENS = 8;

export const CHEST_REWARD = 70;

// Boss (final mission).
export const BOSS_HP = 420;
export const BOSS_SPEED = 44;
export const BOSS_REWARD = 200;
export const BOSS_CHARGE_INTERVAL_MS = 3400;
export const BOSS_CHARGE_SPEED = 330;
export const BOSS_PROJECTILE_INTERVAL_MS = 2500;
export const BOSS_PROJECTILE_SPEED = 175;

// Painted room has walls around the edge; keep the player off them.
export const WALL_INSET = 82;

// Combat hit radii — sized to the *visible* character, not the transparent-padded
// sprite frame, so touch/reach feel fair instead of hitting from empty pixels.
export const PLAYER_RADIUS = 19;
export const ENEMY_RADIUS = 22;
export const BOSS_RADIUS = 58;
export const ORB_RADIUS = 12;

// Knockback impulses (kept punchy but not floaty — big values feel like losing control).
export const PLAYER_HURT_KNOCKBACK = 170;
export const ENEMY_HIT_KNOCKBACK = 180;
