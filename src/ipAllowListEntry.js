module.exports = class IPAllowListEntry {

    constructor(data) {
        this._data = data;
    }

    get name() {
        return this._data.name;
    }

    get cidr() {
        return this._data.allowListValue;
    }

    get isActive() {
        return this._data.isActive;
    }

    get createdAt() {
        return this._data.createdAt;
    }

    get updatedAt() {
        return this._data.updatedAt;
    }
}