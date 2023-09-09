const YAML = require('yaml');
const fs = require('fs');

class Config {
    constructor() {
        const file = fs.readFileSync('./config.yml', 'utf8');
        this.parsed = YAML.parse(file);
    }

    get(group, key) {
        let item = this.parsed[group][key];
        return item;
    }

    set(group, key, value) {
        this.parsed[group][key] = value;
        fs.writeFileSync('./config.yml', YAML.stringify(this.parsed));
    }

    getGroup(_group) {
        let group = this.parsed[_group];
        Object.keys(group).map(key => {
            let item = group[key];
            group[key] = item;
        })
        return group
    }

    getOrDefault(group, key, def) {
        let retr = this.get(group, key);
        if (retr == null)
            retr = def;
        return retr;
    }
}

module.exports = Config;