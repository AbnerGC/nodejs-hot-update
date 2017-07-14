/**
 * Created by Abner on 2017/7/14.
 * E-Mail: jion_cc@163.com
 * github: https://github.com/AbnerGC/node-hot-update
 *
 */

var fs = require('fs');
var path = require('path');
var callsites = require('callsites');

var _cache = {};
var _hasKey = function (obj) {
    for (var key in obj) {
        return true;
    }
    return false;
};

var _copyProperty = function (target, source) {
    // proxy static function
    for (var key in source) {

        var property = source[key];
        if (typeof property == "function") {
            target[key] = function (_key) {
                return function () {
                    return source[_key].apply(source, arguments);
                }
            }(key)
        } else {
            Object.defineProperty(target, key, {
                get: function (_key) {
                    return function () {
                        return source[_key];
                    }
                }(key),
                set: function (_key) {
                    return function (value) {
                        source[_key] = value;
                    }
                }(key)
            });
        }
    }

};

global._require = function (modulePath) {
    var callerPath = callsites()[1].getFileName();
    var _path = require.resolve(path.dirname(callerPath) + '/' + modulePath);

    if (_cache[_path]) return _cache[_path];

    var RealClass = require(_path);
    // constructor[execute property proxy handler when create Object]
    var Proxy = function (){
        var realObj = new RealClass(arguments);
        // proxy all realObj's property[field and method], use getter/setter on field, and use function proxy on function
        _copyProperty(this, realObj);
    };

    if (_hasKey(RealClass)) {

        _copyProperty(Proxy, RealClass);
    }
    // use 'watchFile' and not 'watch' to keep the callback invoke once one time when the file change.
    fs.watchFile(_path, function () {

        delete require.cache[_path];
        // update new js file
        RealClass = require(_path);
        _copyProperty(Proxy, RealClass);
        console.log('update js: ' + _path);
    });
    _cache[_path] = Proxy;
    return Proxy;
};