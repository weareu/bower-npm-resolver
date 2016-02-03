/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2016 Mickael Jeanroy
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/**
 * This module is used as a wrapper for NPM commands.
 * Each functions will returned a promise:
 *  - Resolved with the desired result.
 *  - Rejected with the error returned from NPM.
 */

var Q = require('q');
var npm = require('npm');

var wrapCallback = function(deferred) {
  return function(err, data) {
    if (err) {
      deferred.reject(err);
    } else {
      deferred.resolve(data);
    }
  };
};

var execViewCommand = function(args) {
  var deferred = Q.defer();

  npm.load(function(err) {
    if (err) {
      deferred.reject(err);
    } else {
      npm.commands.view(args, true, wrapCallback(deferred));
    }
  });

  return deferred.promise;
};

var findProxy = function(configList) {
  for (var i = 0, size = configList.length; i < size; ++i) {
    var current = configList[i];
    if (current['proxy'] || current['https-proxy']) {
      return {
        'proxy': current['proxy'],
        'https-proxy': current['https-proxy']
      }
    }
  }

  return {};
};

var getLastKey = function(o) {
  var keys = Object.keys(o);
  keys.sort();
  return keys[keys.length - 1];
};

module.exports = {

  /**
   * This method will return a promise resolved with NPM proxy
   * configuration.
   * Basically, it loads NPM, get proxy settings (`proxy` and `https-proxy` entry) and
   * resolve the promise with an object containing these two entries, such as:
   *
   * ```json
   *  { 'proxy': 'http://proxy:8080', 'https-proxy': 'https://proxy:8080' }
   * ```
   *
   * @returns {Promise} The promise.
   */
  proxy: function() {
    var deferred = Q.defer();

    npm.load(function(err, data) {
      if (err) {
        deferred.reject(err);
      } else {
        deferred.resolve({
          'proxy': data.config.get('proxy'),
          'https-proxy': data.config.get('https-proxy')
        });
      }
    });

    return deferred.promise;
  },

  /**
   * Return the versions defined on NPM for a given package.
   * Basically, execute `npm view pkg versions` and return the results.
   * Note that NPM will return an object, such as:
   *
   * ```json
   *   { '1.7.7': { versions: ['1.0.0', '1.1.0' ] } }
   * ```
   *
   * The promise will be resolved with the array of versions (i.e `['1.0.0', '1.1.0' ]`).
   *
   * @param {String} pkg The package name.
   * @returns {Promise} The promise object.
   */
  releases: function(pkg) {
    return execViewCommand([pkg, 'versions']).then(function(data) {
      // If it is already an array, return it.
      if (Array.isArray(data)) {
        return data;
      }

      // Otherwise, unwrap it.
      var mostRecentVersion = getLastKey(data);
      return data[mostRecentVersion].versions;
    });
  },

  /**
   * Return tarball URL for a given package and version.
   * Basically, execute `npm view pkg@version dist.tarball` and return the results.
   *
   * As with the `releases` method, note that NPM will return an object, such as:
   *
   * ```json
   *   { '1.7.7': { 'dist.tarball': 'http://registry.npmjs.org/bower/-/bower-1.7.7.tgz' } }
   * ```
   *
   * The promise will be resolved with the tarball
   * URL (i.e `'http://registry.npmjs.org/bower/-/bower-1.7.7.tgz'`).
   *
   * @param {String} pkg The package name.
   * @param {String} version The package version.
   * @returns {Promise} The promise object.
   */
  tarball: function(pkg, version) {
    return execViewCommand([pkg + '@' + version, 'dist.tarball']).then(function(data) {
      // If object contains the tarball URL, return it.
      if (data['dist.tarball']) {
        return data['dist.tarball'];
      }

      // Otherwise, unwrap it.
      var mostRecentVersion = getLastKey(data);
      return data[mostRecentVersion]['dist.tarball'];
    });
  }
};
