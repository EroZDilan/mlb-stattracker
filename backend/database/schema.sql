CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER UNIQUE,
    date TEXT NOT NULL,
    home_team TEXT,
    away_team TEXT,
    home_team_id INTEGER,
    away_team_id INTEGER,
    home_score INTEGER,
    away_score INTEGER,
    status TEXT,
    venue TEXT,
    game_type TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS player_game_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER,
    player_id INTEGER,
    player_name TEXT,
    team TEXT,
    team_id INTEGER,
    type TEXT,
    at_bats INTEGER DEFAULT 0,
    hits INTEGER DEFAULT 0,
    runs INTEGER DEFAULT 0,
    rbi INTEGER DEFAULT 0,
    home_runs INTEGER DEFAULT 0,
    doubles INTEGER DEFAULT 0,
    triples INTEGER DEFAULT 0,
    strikeouts INTEGER DEFAULT 0,
    walks INTEGER DEFAULT 0,
    avg REAL DEFAULT 0.0,
    innings_pitched REAL DEFAULT 0.0,
    earned_runs INTEGER DEFAULT 0,
    era REAL DEFAULT 0.0,
    pitches INTEGER DEFAULT 0,
    strikes INTEGER DEFAULT 0,
    opposing_pitcher_id INTEGER,
    UNIQUE(game_id, player_id, type)
);

CREATE TABLE IF NOT EXISTS batter_vs_pitcher (
    batter_id INTEGER,
    pitcher_id INTEGER,
    batter_name TEXT,
    pitcher_name TEXT,
    at_bats INTEGER DEFAULT 0,
    hits INTEGER DEFAULT 0,
    home_runs INTEGER DEFAULT 0,
    avg REAL DEFAULT 0.0,
    last_updated TEXT,
    PRIMARY KEY (batter_id, pitcher_id)
);

CREATE TABLE IF NOT EXISTS probable_pitchers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER,
    date TEXT,
    team TEXT,
    team_id INTEGER,
    pitcher_id INTEGER,
    pitcher_name TEXT,
    era REAL,
    season_wins INTEGER,
    season_losses INTEGER,
    UNIQUE(game_id, team_id)
);

CREATE TABLE IF NOT EXISTS predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT,
    player_id INTEGER,
    player_name TEXT,
    predicted_hits REAL,
    predicted_runs REAL,
    predicted_hr REAL,
    confidence REAL,
    reasoning TEXT,
    opposing_pitcher_id INTEGER,
    opposing_pitcher_name TEXT,
    actual_hits INTEGER,
    actual_runs INTEGER,
    actual_hr INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_games_date ON games(date);
CREATE INDEX IF NOT EXISTS idx_pgs_player ON player_game_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_pgs_game ON player_game_stats(game_id);
CREATE INDEX IF NOT EXISTS idx_bvp_batter ON batter_vs_pitcher(batter_id);
CREATE INDEX IF NOT EXISTS idx_pp_date ON probable_pitchers(date);
CREATE INDEX IF NOT EXISTS idx_pred_date ON predictions(date);
