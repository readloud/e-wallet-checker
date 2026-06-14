package config

import (
    "time"
    "github.com/spf13/viper"
)

type Config struct {
    Server   ServerConfig   `mapstructure:"server"`
    Database DatabaseConfig `mapstructure:"database"`
    Redis    RedisConfig    `mapstructure:"redis"`
    Security SecurityConfig `mapstructure:"security"`
    RateLimit RateLimitConfig `mapstructure:"rate_limit"`
    Log      LogConfig      `mapstructure:"log"`
}

type ServerConfig struct {
    Port         string        `mapstructure:"port"`
    ReadTimeout  time.Duration `mapstructure:"read_timeout"`
    WriteTimeout time.Duration `mapstructure:"write_timeout"`
    IdleTimeout  time.Duration `mapstructure:"idle_timeout"`
    MaxHeaderBytes int         `mapstructure:"max_header_bytes"`
}

type DatabaseConfig struct {
    Host            string `mapstructure:"host"`
    Port            int    `mapstructure:"port"`
    User            string `mapstructure:"user"`
    Password        string `mapstructure:"password"`
    DBName          string `mapstructure:"dbname"`
    SSLMode         string `mapstructure:"ssl_mode"`
    MaxOpenConns    int    `mapstructure:"max_open_conns"`
    MaxIdleConns    int    `mapstructure:"max_idle_conns"`
    ConnMaxLifetime int    `mapstructure:"conn_max_lifetime"`
}

type RedisConfig struct {
    Host     string `mapstructure:"host"`
    Port     int    `mapstructure:"port"`
    Password string `mapstructure:"password"`
    DB       int    `mapstructure:"db"`
    PoolSize int    `mapstructure:"pool_size"`
}

type SecurityConfig struct {
    APIKey       string `mapstructure:"api_key"`
    JWTSecret    string `mapstructure:"jwt_secret"`
    EnableCORS   bool   `mapstructure:"enable_cors"`
    AllowedOrigins []string `mapstructure:"allowed_origins"`
}

type RateLimitConfig struct {
    Enabled      bool `mapstructure:"enabled"`
    RequestsPerSecond int `mapstructure:"requests_per_second"`
    Burst        int `mapstructure:"burst"`
}

type LogConfig struct {
    Level    string `mapstructure:"level"`
    Encoding string `mapstructure:"encoding"`
    Output   string `mapstructure:"output"`
}

func Load() (*Config, error) {
    viper.SetConfigName("config")
    viper.SetConfigType("yaml")
    viper.AddConfigPath("./configs")
    viper.AddConfigPath(".")
    
    viper.AutomaticEnv()
    
    if err := viper.ReadInConfig(); err != nil {
        return nil, err
    }
    
    var config Config
    if err := viper.Unmarshal(&config); err != nil {
        return nil, err
    }
    
    return &config, nil
}
