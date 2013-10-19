var builder    = require('ltx'),
    PubSub     = require('xmpp-ftw-pubsub'),
    Presence   = require('xmpp-ftw/lib/presence'),
    rsm        = require('xmpp-ftw/lib/utils/xep-0059'),
    itemParser = require('xmpp-ftw-item-parser')

var Fanout = function() {
    this.itemParser
    this.presence = new Presence()
    
    this.maxRecentItemsPerChannel = 30
}

Fanout.prototype.__proto__ = PubSub.prototype

Fanout.prototype.PUBSUB_SERVICE = 'pubsub.s.fanout.io'

var init = Fanout.prototype.init

Fanout.prototype.init = function(manager) {
    init.call(this, manager)
    this.presence.init(manager, true)
    this.presenceSent = false
}

Fanout.prototype._events = {
    'fanout.fpp.subscribe': 'doSubscribe',
    'fanout.fpp.unsubscribe': 'doUnsubscribe'
}

Fanout.prototype.doSubscribe = function(data, callback) {
    if (!this._checkCall(data, callback)) return
    if (!this.presenceSent) {
        this.presence.sendPresence({ to: data.to })
        this.presenceSent = true
    }
    this.subscribe(data, callback)
}

Fanout.prototype.doUnsubscribe = function(data, callback) {
    if (!this._checkCall(data, callback)) return
    delete(data.jid)
    this.unsubscribe(data, callback)
}

Fanout.prototype._itemNotification = function(stanza, items) {
    var data = {}
    this._getItemData(items, data)
    if (stanza.getChild('headers'))
        this._getHeaderData(stanza, data)
    if (stanza.getChild('delay'))
        data.delay = stanza.getChild('delay').attrs.stamp
    this.socket.emit('fanout.fpp.push', data)
    return true
}

Fanout.prototype._checkCall = function(data, callback, skipCallback) {
    if (!data) return this._clientError('Missing payload', data, callback)
    if (!data.realm)
        return this._clientError('Missing realm', data, callback)
    if (!data.channel)
        return this._clientError('Missing channel', data, callback)
    data.node = '/' + data.realm + '/' + data.channel
    delete data.realm
    delete data.channel
    if (!data.to) data.to = this.PUBSUB_SERVICE
    if (!skipCallback && (typeof callback !== 'function')) {
        this._clientError('Missing callback', data)
        return false
    }
    return true
}

module.exports = Fanout
