module.exports = {
    "host": "0.0.0.0",
    "port": 9090,
    // "baseURL": "192.168.1.123:9090",
    "exitOnUncaught": false,
    "login": {
        "enabled": true,
        "sessionSecret": "<SOMETHING RANDOM>",
        "discord": {
            "enabled": false,   // Switch to true if using
            "clientID": "<DISCORD BOT ID>",
            "clientSecret": "<DISCORD BOT SECRET>",
            "scope": "identify guilds",
            "allowedGuilds": [
                {
                    "guildID": "<DISCORD SERVER ID>",
                    "allowedRoleIDs": [
                        "<ORGANIZER ROLE ID>"
                    ],
                    "guildBotToken": "<DISCORD BOT TOKEN>"
                }
            ]
        },
        "local": {
            "enabled": true,
            "allowedUsers": [
                { "username": "wasd", "password": "<SOME PASSWORD>" }
            ]
        }
    },
    "logging": {
        "file": {
            "enabled": true,
            "level": "verbose"
        }
    },
    "sentry": {
        "enabled": false,
        "dsn": "<SENTRY LINK HERE>"
    }
}