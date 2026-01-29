import { createRequire } from "node:module";
var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __toESM = (mod, isNodeMode, target) => {
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  for (let key of __getOwnPropNames(mod))
    if (!__hasOwnProp.call(to, key))
      __defProp(to, key, {
        get: () => mod[key],
        enumerable: true
      });
  return to;
};
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __require = /* @__PURE__ */ createRequire(import.meta.url);

// ../../node_modules/.bun/graceful-fs@4.2.11/node_modules/graceful-fs/polyfills.js
var require_polyfills = __commonJS((exports, module) => {
  var constants = __require("constants");
  var origCwd = process.cwd;
  var cwd = null;
  var platform = process.env.GRACEFUL_FS_PLATFORM || process.platform;
  process.cwd = function() {
    if (!cwd)
      cwd = origCwd.call(process);
    return cwd;
  };
  try {
    process.cwd();
  } catch (er) {}
  if (typeof process.chdir === "function") {
    chdir = process.chdir;
    process.chdir = function(d) {
      cwd = null;
      chdir.call(process, d);
    };
    if (Object.setPrototypeOf)
      Object.setPrototypeOf(process.chdir, chdir);
  }
  var chdir;
  module.exports = patch;
  function patch(fs) {
    if (constants.hasOwnProperty("O_SYMLINK") && process.version.match(/^v0\.6\.[0-2]|^v0\.5\./)) {
      patchLchmod(fs);
    }
    if (!fs.lutimes) {
      patchLutimes(fs);
    }
    fs.chown = chownFix(fs.chown);
    fs.fchown = chownFix(fs.fchown);
    fs.lchown = chownFix(fs.lchown);
    fs.chmod = chmodFix(fs.chmod);
    fs.fchmod = chmodFix(fs.fchmod);
    fs.lchmod = chmodFix(fs.lchmod);
    fs.chownSync = chownFixSync(fs.chownSync);
    fs.fchownSync = chownFixSync(fs.fchownSync);
    fs.lchownSync = chownFixSync(fs.lchownSync);
    fs.chmodSync = chmodFixSync(fs.chmodSync);
    fs.fchmodSync = chmodFixSync(fs.fchmodSync);
    fs.lchmodSync = chmodFixSync(fs.lchmodSync);
    fs.stat = statFix(fs.stat);
    fs.fstat = statFix(fs.fstat);
    fs.lstat = statFix(fs.lstat);
    fs.statSync = statFixSync(fs.statSync);
    fs.fstatSync = statFixSync(fs.fstatSync);
    fs.lstatSync = statFixSync(fs.lstatSync);
    if (fs.chmod && !fs.lchmod) {
      fs.lchmod = function(path, mode, cb) {
        if (cb)
          process.nextTick(cb);
      };
      fs.lchmodSync = function() {};
    }
    if (fs.chown && !fs.lchown) {
      fs.lchown = function(path, uid, gid, cb) {
        if (cb)
          process.nextTick(cb);
      };
      fs.lchownSync = function() {};
    }
    if (platform === "win32") {
      fs.rename = typeof fs.rename !== "function" ? fs.rename : function(fs$rename) {
        function rename(from, to, cb) {
          var start = Date.now();
          var backoff = 0;
          fs$rename(from, to, function CB(er) {
            if (er && (er.code === "EACCES" || er.code === "EPERM" || er.code === "EBUSY") && Date.now() - start < 60000) {
              setTimeout(function() {
                fs.stat(to, function(stater, st) {
                  if (stater && stater.code === "ENOENT")
                    fs$rename(from, to, CB);
                  else
                    cb(er);
                });
              }, backoff);
              if (backoff < 100)
                backoff += 10;
              return;
            }
            if (cb)
              cb(er);
          });
        }
        if (Object.setPrototypeOf)
          Object.setPrototypeOf(rename, fs$rename);
        return rename;
      }(fs.rename);
    }
    fs.read = typeof fs.read !== "function" ? fs.read : function(fs$read) {
      function read(fd, buffer, offset, length, position, callback_) {
        var callback;
        if (callback_ && typeof callback_ === "function") {
          var eagCounter = 0;
          callback = function(er, _, __) {
            if (er && er.code === "EAGAIN" && eagCounter < 10) {
              eagCounter++;
              return fs$read.call(fs, fd, buffer, offset, length, position, callback);
            }
            callback_.apply(this, arguments);
          };
        }
        return fs$read.call(fs, fd, buffer, offset, length, position, callback);
      }
      if (Object.setPrototypeOf)
        Object.setPrototypeOf(read, fs$read);
      return read;
    }(fs.read);
    fs.readSync = typeof fs.readSync !== "function" ? fs.readSync : function(fs$readSync) {
      return function(fd, buffer, offset, length, position) {
        var eagCounter = 0;
        while (true) {
          try {
            return fs$readSync.call(fs, fd, buffer, offset, length, position);
          } catch (er) {
            if (er.code === "EAGAIN" && eagCounter < 10) {
              eagCounter++;
              continue;
            }
            throw er;
          }
        }
      };
    }(fs.readSync);
    function patchLchmod(fs2) {
      fs2.lchmod = function(path, mode, callback) {
        fs2.open(path, constants.O_WRONLY | constants.O_SYMLINK, mode, function(err, fd) {
          if (err) {
            if (callback)
              callback(err);
            return;
          }
          fs2.fchmod(fd, mode, function(err2) {
            fs2.close(fd, function(err22) {
              if (callback)
                callback(err2 || err22);
            });
          });
        });
      };
      fs2.lchmodSync = function(path, mode) {
        var fd = fs2.openSync(path, constants.O_WRONLY | constants.O_SYMLINK, mode);
        var threw = true;
        var ret;
        try {
          ret = fs2.fchmodSync(fd, mode);
          threw = false;
        } finally {
          if (threw) {
            try {
              fs2.closeSync(fd);
            } catch (er) {}
          } else {
            fs2.closeSync(fd);
          }
        }
        return ret;
      };
    }
    function patchLutimes(fs2) {
      if (constants.hasOwnProperty("O_SYMLINK") && fs2.futimes) {
        fs2.lutimes = function(path, at, mt, cb) {
          fs2.open(path, constants.O_SYMLINK, function(er, fd) {
            if (er) {
              if (cb)
                cb(er);
              return;
            }
            fs2.futimes(fd, at, mt, function(er2) {
              fs2.close(fd, function(er22) {
                if (cb)
                  cb(er2 || er22);
              });
            });
          });
        };
        fs2.lutimesSync = function(path, at, mt) {
          var fd = fs2.openSync(path, constants.O_SYMLINK);
          var ret;
          var threw = true;
          try {
            ret = fs2.futimesSync(fd, at, mt);
            threw = false;
          } finally {
            if (threw) {
              try {
                fs2.closeSync(fd);
              } catch (er) {}
            } else {
              fs2.closeSync(fd);
            }
          }
          return ret;
        };
      } else if (fs2.futimes) {
        fs2.lutimes = function(_a, _b, _c, cb) {
          if (cb)
            process.nextTick(cb);
        };
        fs2.lutimesSync = function() {};
      }
    }
    function chmodFix(orig) {
      if (!orig)
        return orig;
      return function(target, mode, cb) {
        return orig.call(fs, target, mode, function(er) {
          if (chownErOk(er))
            er = null;
          if (cb)
            cb.apply(this, arguments);
        });
      };
    }
    function chmodFixSync(orig) {
      if (!orig)
        return orig;
      return function(target, mode) {
        try {
          return orig.call(fs, target, mode);
        } catch (er) {
          if (!chownErOk(er))
            throw er;
        }
      };
    }
    function chownFix(orig) {
      if (!orig)
        return orig;
      return function(target, uid, gid, cb) {
        return orig.call(fs, target, uid, gid, function(er) {
          if (chownErOk(er))
            er = null;
          if (cb)
            cb.apply(this, arguments);
        });
      };
    }
    function chownFixSync(orig) {
      if (!orig)
        return orig;
      return function(target, uid, gid) {
        try {
          return orig.call(fs, target, uid, gid);
        } catch (er) {
          if (!chownErOk(er))
            throw er;
        }
      };
    }
    function statFix(orig) {
      if (!orig)
        return orig;
      return function(target, options, cb) {
        if (typeof options === "function") {
          cb = options;
          options = null;
        }
        function callback(er, stats) {
          if (stats) {
            if (stats.uid < 0)
              stats.uid += 4294967296;
            if (stats.gid < 0)
              stats.gid += 4294967296;
          }
          if (cb)
            cb.apply(this, arguments);
        }
        return options ? orig.call(fs, target, options, callback) : orig.call(fs, target, callback);
      };
    }
    function statFixSync(orig) {
      if (!orig)
        return orig;
      return function(target, options) {
        var stats = options ? orig.call(fs, target, options) : orig.call(fs, target);
        if (stats) {
          if (stats.uid < 0)
            stats.uid += 4294967296;
          if (stats.gid < 0)
            stats.gid += 4294967296;
        }
        return stats;
      };
    }
    function chownErOk(er) {
      if (!er)
        return true;
      if (er.code === "ENOSYS")
        return true;
      var nonroot = !process.getuid || process.getuid() !== 0;
      if (nonroot) {
        if (er.code === "EINVAL" || er.code === "EPERM")
          return true;
      }
      return false;
    }
  }
});

// ../../node_modules/.bun/graceful-fs@4.2.11/node_modules/graceful-fs/legacy-streams.js
var require_legacy_streams = __commonJS((exports, module) => {
  var Stream = __require("stream").Stream;
  module.exports = legacy;
  function legacy(fs) {
    return {
      ReadStream,
      WriteStream
    };
    function ReadStream(path, options) {
      if (!(this instanceof ReadStream))
        return new ReadStream(path, options);
      Stream.call(this);
      var self = this;
      this.path = path;
      this.fd = null;
      this.readable = true;
      this.paused = false;
      this.flags = "r";
      this.mode = 438;
      this.bufferSize = 64 * 1024;
      options = options || {};
      var keys = Object.keys(options);
      for (var index = 0, length = keys.length;index < length; index++) {
        var key = keys[index];
        this[key] = options[key];
      }
      if (this.encoding)
        this.setEncoding(this.encoding);
      if (this.start !== undefined) {
        if (typeof this.start !== "number") {
          throw TypeError("start must be a Number");
        }
        if (this.end === undefined) {
          this.end = Infinity;
        } else if (typeof this.end !== "number") {
          throw TypeError("end must be a Number");
        }
        if (this.start > this.end) {
          throw new Error("start must be <= end");
        }
        this.pos = this.start;
      }
      if (this.fd !== null) {
        process.nextTick(function() {
          self._read();
        });
        return;
      }
      fs.open(this.path, this.flags, this.mode, function(err, fd) {
        if (err) {
          self.emit("error", err);
          self.readable = false;
          return;
        }
        self.fd = fd;
        self.emit("open", fd);
        self._read();
      });
    }
    function WriteStream(path, options) {
      if (!(this instanceof WriteStream))
        return new WriteStream(path, options);
      Stream.call(this);
      this.path = path;
      this.fd = null;
      this.writable = true;
      this.flags = "w";
      this.encoding = "binary";
      this.mode = 438;
      this.bytesWritten = 0;
      options = options || {};
      var keys = Object.keys(options);
      for (var index = 0, length = keys.length;index < length; index++) {
        var key = keys[index];
        this[key] = options[key];
      }
      if (this.start !== undefined) {
        if (typeof this.start !== "number") {
          throw TypeError("start must be a Number");
        }
        if (this.start < 0) {
          throw new Error("start must be >= zero");
        }
        this.pos = this.start;
      }
      this.busy = false;
      this._queue = [];
      if (this.fd === null) {
        this._open = fs.open;
        this._queue.push([this._open, this.path, this.flags, this.mode, undefined]);
        this.flush();
      }
    }
  }
});

// ../../node_modules/.bun/graceful-fs@4.2.11/node_modules/graceful-fs/clone.js
var require_clone = __commonJS((exports, module) => {
  module.exports = clone;
  var getPrototypeOf = Object.getPrototypeOf || function(obj) {
    return obj.__proto__;
  };
  function clone(obj) {
    if (obj === null || typeof obj !== "object")
      return obj;
    if (obj instanceof Object)
      var copy = { __proto__: getPrototypeOf(obj) };
    else
      var copy = Object.create(null);
    Object.getOwnPropertyNames(obj).forEach(function(key) {
      Object.defineProperty(copy, key, Object.getOwnPropertyDescriptor(obj, key));
    });
    return copy;
  }
});

// ../../node_modules/.bun/graceful-fs@4.2.11/node_modules/graceful-fs/graceful-fs.js
var require_graceful_fs = __commonJS((exports, module) => {
  var fs = __require("fs");
  var polyfills = require_polyfills();
  var legacy = require_legacy_streams();
  var clone = require_clone();
  var util = __require("util");
  var gracefulQueue;
  var previousSymbol;
  if (typeof Symbol === "function" && typeof Symbol.for === "function") {
    gracefulQueue = Symbol.for("graceful-fs.queue");
    previousSymbol = Symbol.for("graceful-fs.previous");
  } else {
    gracefulQueue = "___graceful-fs.queue";
    previousSymbol = "___graceful-fs.previous";
  }
  function noop() {}
  function publishQueue(context, queue2) {
    Object.defineProperty(context, gracefulQueue, {
      get: function() {
        return queue2;
      }
    });
  }
  var debug = noop;
  if (util.debuglog)
    debug = util.debuglog("gfs4");
  else if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || ""))
    debug = function() {
      var m = util.format.apply(util, arguments);
      m = "GFS4: " + m.split(/\n/).join(`
GFS4: `);
      console.error(m);
    };
  if (!fs[gracefulQueue]) {
    queue = global[gracefulQueue] || [];
    publishQueue(fs, queue);
    fs.close = function(fs$close) {
      function close(fd, cb) {
        return fs$close.call(fs, fd, function(err) {
          if (!err) {
            resetQueue();
          }
          if (typeof cb === "function")
            cb.apply(this, arguments);
        });
      }
      Object.defineProperty(close, previousSymbol, {
        value: fs$close
      });
      return close;
    }(fs.close);
    fs.closeSync = function(fs$closeSync) {
      function closeSync(fd) {
        fs$closeSync.apply(fs, arguments);
        resetQueue();
      }
      Object.defineProperty(closeSync, previousSymbol, {
        value: fs$closeSync
      });
      return closeSync;
    }(fs.closeSync);
    if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || "")) {
      process.on("exit", function() {
        debug(fs[gracefulQueue]);
        __require("assert").equal(fs[gracefulQueue].length, 0);
      });
    }
  }
  var queue;
  if (!global[gracefulQueue]) {
    publishQueue(global, fs[gracefulQueue]);
  }
  module.exports = patch(clone(fs));
  if (process.env.TEST_GRACEFUL_FS_GLOBAL_PATCH && !fs.__patched) {
    module.exports = patch(fs);
    fs.__patched = true;
  }
  function patch(fs2) {
    polyfills(fs2);
    fs2.gracefulify = patch;
    fs2.createReadStream = createReadStream;
    fs2.createWriteStream = createWriteStream;
    var fs$readFile = fs2.readFile;
    fs2.readFile = readFile;
    function readFile(path, options, cb) {
      if (typeof options === "function")
        cb = options, options = null;
      return go$readFile(path, options, cb);
      function go$readFile(path2, options2, cb2, startTime) {
        return fs$readFile(path2, options2, function(err) {
          if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
            enqueue([go$readFile, [path2, options2, cb2], err, startTime || Date.now(), Date.now()]);
          else {
            if (typeof cb2 === "function")
              cb2.apply(this, arguments);
          }
        });
      }
    }
    var fs$writeFile = fs2.writeFile;
    fs2.writeFile = writeFile;
    function writeFile(path, data, options, cb) {
      if (typeof options === "function")
        cb = options, options = null;
      return go$writeFile(path, data, options, cb);
      function go$writeFile(path2, data2, options2, cb2, startTime) {
        return fs$writeFile(path2, data2, options2, function(err) {
          if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
            enqueue([go$writeFile, [path2, data2, options2, cb2], err, startTime || Date.now(), Date.now()]);
          else {
            if (typeof cb2 === "function")
              cb2.apply(this, arguments);
          }
        });
      }
    }
    var fs$appendFile = fs2.appendFile;
    if (fs$appendFile)
      fs2.appendFile = appendFile;
    function appendFile(path, data, options, cb) {
      if (typeof options === "function")
        cb = options, options = null;
      return go$appendFile(path, data, options, cb);
      function go$appendFile(path2, data2, options2, cb2, startTime) {
        return fs$appendFile(path2, data2, options2, function(err) {
          if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
            enqueue([go$appendFile, [path2, data2, options2, cb2], err, startTime || Date.now(), Date.now()]);
          else {
            if (typeof cb2 === "function")
              cb2.apply(this, arguments);
          }
        });
      }
    }
    var fs$copyFile = fs2.copyFile;
    if (fs$copyFile)
      fs2.copyFile = copyFile;
    function copyFile(src, dest, flags, cb) {
      if (typeof flags === "function") {
        cb = flags;
        flags = 0;
      }
      return go$copyFile(src, dest, flags, cb);
      function go$copyFile(src2, dest2, flags2, cb2, startTime) {
        return fs$copyFile(src2, dest2, flags2, function(err) {
          if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
            enqueue([go$copyFile, [src2, dest2, flags2, cb2], err, startTime || Date.now(), Date.now()]);
          else {
            if (typeof cb2 === "function")
              cb2.apply(this, arguments);
          }
        });
      }
    }
    var fs$readdir = fs2.readdir;
    fs2.readdir = readdir;
    var noReaddirOptionVersions = /^v[0-5]\./;
    function readdir(path, options, cb) {
      if (typeof options === "function")
        cb = options, options = null;
      var go$readdir = noReaddirOptionVersions.test(process.version) ? function go$readdir(path2, options2, cb2, startTime) {
        return fs$readdir(path2, fs$readdirCallback(path2, options2, cb2, startTime));
      } : function go$readdir(path2, options2, cb2, startTime) {
        return fs$readdir(path2, options2, fs$readdirCallback(path2, options2, cb2, startTime));
      };
      return go$readdir(path, options, cb);
      function fs$readdirCallback(path2, options2, cb2, startTime) {
        return function(err, files) {
          if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
            enqueue([
              go$readdir,
              [path2, options2, cb2],
              err,
              startTime || Date.now(),
              Date.now()
            ]);
          else {
            if (files && files.sort)
              files.sort();
            if (typeof cb2 === "function")
              cb2.call(this, err, files);
          }
        };
      }
    }
    if (process.version.substr(0, 4) === "v0.8") {
      var legStreams = legacy(fs2);
      ReadStream = legStreams.ReadStream;
      WriteStream = legStreams.WriteStream;
    }
    var fs$ReadStream = fs2.ReadStream;
    if (fs$ReadStream) {
      ReadStream.prototype = Object.create(fs$ReadStream.prototype);
      ReadStream.prototype.open = ReadStream$open;
    }
    var fs$WriteStream = fs2.WriteStream;
    if (fs$WriteStream) {
      WriteStream.prototype = Object.create(fs$WriteStream.prototype);
      WriteStream.prototype.open = WriteStream$open;
    }
    Object.defineProperty(fs2, "ReadStream", {
      get: function() {
        return ReadStream;
      },
      set: function(val) {
        ReadStream = val;
      },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(fs2, "WriteStream", {
      get: function() {
        return WriteStream;
      },
      set: function(val) {
        WriteStream = val;
      },
      enumerable: true,
      configurable: true
    });
    var FileReadStream = ReadStream;
    Object.defineProperty(fs2, "FileReadStream", {
      get: function() {
        return FileReadStream;
      },
      set: function(val) {
        FileReadStream = val;
      },
      enumerable: true,
      configurable: true
    });
    var FileWriteStream = WriteStream;
    Object.defineProperty(fs2, "FileWriteStream", {
      get: function() {
        return FileWriteStream;
      },
      set: function(val) {
        FileWriteStream = val;
      },
      enumerable: true,
      configurable: true
    });
    function ReadStream(path, options) {
      if (this instanceof ReadStream)
        return fs$ReadStream.apply(this, arguments), this;
      else
        return ReadStream.apply(Object.create(ReadStream.prototype), arguments);
    }
    function ReadStream$open() {
      var that = this;
      open(that.path, that.flags, that.mode, function(err, fd) {
        if (err) {
          if (that.autoClose)
            that.destroy();
          that.emit("error", err);
        } else {
          that.fd = fd;
          that.emit("open", fd);
          that.read();
        }
      });
    }
    function WriteStream(path, options) {
      if (this instanceof WriteStream)
        return fs$WriteStream.apply(this, arguments), this;
      else
        return WriteStream.apply(Object.create(WriteStream.prototype), arguments);
    }
    function WriteStream$open() {
      var that = this;
      open(that.path, that.flags, that.mode, function(err, fd) {
        if (err) {
          that.destroy();
          that.emit("error", err);
        } else {
          that.fd = fd;
          that.emit("open", fd);
        }
      });
    }
    function createReadStream(path, options) {
      return new fs2.ReadStream(path, options);
    }
    function createWriteStream(path, options) {
      return new fs2.WriteStream(path, options);
    }
    var fs$open = fs2.open;
    fs2.open = open;
    function open(path, flags, mode, cb) {
      if (typeof mode === "function")
        cb = mode, mode = null;
      return go$open(path, flags, mode, cb);
      function go$open(path2, flags2, mode2, cb2, startTime) {
        return fs$open(path2, flags2, mode2, function(err, fd) {
          if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
            enqueue([go$open, [path2, flags2, mode2, cb2], err, startTime || Date.now(), Date.now()]);
          else {
            if (typeof cb2 === "function")
              cb2.apply(this, arguments);
          }
        });
      }
    }
    return fs2;
  }
  function enqueue(elem) {
    debug("ENQUEUE", elem[0].name, elem[1]);
    fs[gracefulQueue].push(elem);
    retry();
  }
  var retryTimer;
  function resetQueue() {
    var now = Date.now();
    for (var i = 0;i < fs[gracefulQueue].length; ++i) {
      if (fs[gracefulQueue][i].length > 2) {
        fs[gracefulQueue][i][3] = now;
        fs[gracefulQueue][i][4] = now;
      }
    }
    retry();
  }
  function retry() {
    clearTimeout(retryTimer);
    retryTimer = undefined;
    if (fs[gracefulQueue].length === 0)
      return;
    var elem = fs[gracefulQueue].shift();
    var fn = elem[0];
    var args = elem[1];
    var err = elem[2];
    var startTime = elem[3];
    var lastTime = elem[4];
    if (startTime === undefined) {
      debug("RETRY", fn.name, args);
      fn.apply(null, args);
    } else if (Date.now() - startTime >= 60000) {
      debug("TIMEOUT", fn.name, args);
      var cb = args.pop();
      if (typeof cb === "function")
        cb.call(null, err);
    } else {
      var sinceAttempt = Date.now() - lastTime;
      var sinceStart = Math.max(lastTime - startTime, 1);
      var desiredDelay = Math.min(sinceStart * 1.2, 100);
      if (sinceAttempt >= desiredDelay) {
        debug("RETRY", fn.name, args);
        fn.apply(null, args.concat([startTime]));
      } else {
        fs[gracefulQueue].push(elem);
      }
    }
    if (retryTimer === undefined) {
      retryTimer = setTimeout(retry, 0);
    }
  }
});

// ../../node_modules/.bun/retry@0.12.0/node_modules/retry/lib/retry_operation.js
var require_retry_operation = __commonJS((exports, module) => {
  function RetryOperation(timeouts, options) {
    if (typeof options === "boolean") {
      options = { forever: options };
    }
    this._originalTimeouts = JSON.parse(JSON.stringify(timeouts));
    this._timeouts = timeouts;
    this._options = options || {};
    this._maxRetryTime = options && options.maxRetryTime || Infinity;
    this._fn = null;
    this._errors = [];
    this._attempts = 1;
    this._operationTimeout = null;
    this._operationTimeoutCb = null;
    this._timeout = null;
    this._operationStart = null;
    if (this._options.forever) {
      this._cachedTimeouts = this._timeouts.slice(0);
    }
  }
  module.exports = RetryOperation;
  RetryOperation.prototype.reset = function() {
    this._attempts = 1;
    this._timeouts = this._originalTimeouts;
  };
  RetryOperation.prototype.stop = function() {
    if (this._timeout) {
      clearTimeout(this._timeout);
    }
    this._timeouts = [];
    this._cachedTimeouts = null;
  };
  RetryOperation.prototype.retry = function(err) {
    if (this._timeout) {
      clearTimeout(this._timeout);
    }
    if (!err) {
      return false;
    }
    var currentTime = new Date().getTime();
    if (err && currentTime - this._operationStart >= this._maxRetryTime) {
      this._errors.unshift(new Error("RetryOperation timeout occurred"));
      return false;
    }
    this._errors.push(err);
    var timeout = this._timeouts.shift();
    if (timeout === undefined) {
      if (this._cachedTimeouts) {
        this._errors.splice(this._errors.length - 1, this._errors.length);
        this._timeouts = this._cachedTimeouts.slice(0);
        timeout = this._timeouts.shift();
      } else {
        return false;
      }
    }
    var self = this;
    var timer = setTimeout(function() {
      self._attempts++;
      if (self._operationTimeoutCb) {
        self._timeout = setTimeout(function() {
          self._operationTimeoutCb(self._attempts);
        }, self._operationTimeout);
        if (self._options.unref) {
          self._timeout.unref();
        }
      }
      self._fn(self._attempts);
    }, timeout);
    if (this._options.unref) {
      timer.unref();
    }
    return true;
  };
  RetryOperation.prototype.attempt = function(fn, timeoutOps) {
    this._fn = fn;
    if (timeoutOps) {
      if (timeoutOps.timeout) {
        this._operationTimeout = timeoutOps.timeout;
      }
      if (timeoutOps.cb) {
        this._operationTimeoutCb = timeoutOps.cb;
      }
    }
    var self = this;
    if (this._operationTimeoutCb) {
      this._timeout = setTimeout(function() {
        self._operationTimeoutCb();
      }, self._operationTimeout);
    }
    this._operationStart = new Date().getTime();
    this._fn(this._attempts);
  };
  RetryOperation.prototype.try = function(fn) {
    console.log("Using RetryOperation.try() is deprecated");
    this.attempt(fn);
  };
  RetryOperation.prototype.start = function(fn) {
    console.log("Using RetryOperation.start() is deprecated");
    this.attempt(fn);
  };
  RetryOperation.prototype.start = RetryOperation.prototype.try;
  RetryOperation.prototype.errors = function() {
    return this._errors;
  };
  RetryOperation.prototype.attempts = function() {
    return this._attempts;
  };
  RetryOperation.prototype.mainError = function() {
    if (this._errors.length === 0) {
      return null;
    }
    var counts = {};
    var mainError = null;
    var mainErrorCount = 0;
    for (var i = 0;i < this._errors.length; i++) {
      var error = this._errors[i];
      var message = error.message;
      var count = (counts[message] || 0) + 1;
      counts[message] = count;
      if (count >= mainErrorCount) {
        mainError = error;
        mainErrorCount = count;
      }
    }
    return mainError;
  };
});

// ../../node_modules/.bun/retry@0.12.0/node_modules/retry/lib/retry.js
var require_retry = __commonJS((exports) => {
  var RetryOperation = require_retry_operation();
  exports.operation = function(options) {
    var timeouts = exports.timeouts(options);
    return new RetryOperation(timeouts, {
      forever: options && options.forever,
      unref: options && options.unref,
      maxRetryTime: options && options.maxRetryTime
    });
  };
  exports.timeouts = function(options) {
    if (options instanceof Array) {
      return [].concat(options);
    }
    var opts = {
      retries: 10,
      factor: 2,
      minTimeout: 1 * 1000,
      maxTimeout: Infinity,
      randomize: false
    };
    for (var key in options) {
      opts[key] = options[key];
    }
    if (opts.minTimeout > opts.maxTimeout) {
      throw new Error("minTimeout is greater than maxTimeout");
    }
    var timeouts = [];
    for (var i = 0;i < opts.retries; i++) {
      timeouts.push(this.createTimeout(i, opts));
    }
    if (options && options.forever && !timeouts.length) {
      timeouts.push(this.createTimeout(i, opts));
    }
    timeouts.sort(function(a, b) {
      return a - b;
    });
    return timeouts;
  };
  exports.createTimeout = function(attempt, opts) {
    var random = opts.randomize ? Math.random() + 1 : 1;
    var timeout = Math.round(random * opts.minTimeout * Math.pow(opts.factor, attempt));
    timeout = Math.min(timeout, opts.maxTimeout);
    return timeout;
  };
  exports.wrap = function(obj, options, methods) {
    if (options instanceof Array) {
      methods = options;
      options = null;
    }
    if (!methods) {
      methods = [];
      for (var key in obj) {
        if (typeof obj[key] === "function") {
          methods.push(key);
        }
      }
    }
    for (var i = 0;i < methods.length; i++) {
      var method = methods[i];
      var original = obj[method];
      obj[method] = function retryWrapper(original2) {
        var op = exports.operation(options);
        var args = Array.prototype.slice.call(arguments, 1);
        var callback = args.pop();
        args.push(function(err) {
          if (op.retry(err)) {
            return;
          }
          if (err) {
            arguments[0] = op.mainError();
          }
          callback.apply(this, arguments);
        });
        op.attempt(function() {
          original2.apply(obj, args);
        });
      }.bind(obj, original);
      obj[method].options = options;
    }
  };
});

// ../../node_modules/.bun/signal-exit@3.0.7/node_modules/signal-exit/signals.js
var require_signals = __commonJS((exports, module) => {
  module.exports = [
    "SIGABRT",
    "SIGALRM",
    "SIGHUP",
    "SIGINT",
    "SIGTERM"
  ];
  if (process.platform !== "win32") {
    module.exports.push("SIGVTALRM", "SIGXCPU", "SIGXFSZ", "SIGUSR2", "SIGTRAP", "SIGSYS", "SIGQUIT", "SIGIOT");
  }
  if (process.platform === "linux") {
    module.exports.push("SIGIO", "SIGPOLL", "SIGPWR", "SIGSTKFLT", "SIGUNUSED");
  }
});

// ../../node_modules/.bun/signal-exit@3.0.7/node_modules/signal-exit/index.js
var require_signal_exit = __commonJS((exports, module) => {
  var process2 = global.process;
  var processOk = function(process3) {
    return process3 && typeof process3 === "object" && typeof process3.removeListener === "function" && typeof process3.emit === "function" && typeof process3.reallyExit === "function" && typeof process3.listeners === "function" && typeof process3.kill === "function" && typeof process3.pid === "number" && typeof process3.on === "function";
  };
  if (!processOk(process2)) {
    module.exports = function() {
      return function() {};
    };
  } else {
    assert = __require("assert");
    signals = require_signals();
    isWin = /^win/i.test(process2.platform);
    EE = __require("events");
    if (typeof EE !== "function") {
      EE = EE.EventEmitter;
    }
    if (process2.__signal_exit_emitter__) {
      emitter = process2.__signal_exit_emitter__;
    } else {
      emitter = process2.__signal_exit_emitter__ = new EE;
      emitter.count = 0;
      emitter.emitted = {};
    }
    if (!emitter.infinite) {
      emitter.setMaxListeners(Infinity);
      emitter.infinite = true;
    }
    module.exports = function(cb, opts) {
      if (!processOk(global.process)) {
        return function() {};
      }
      assert.equal(typeof cb, "function", "a callback must be provided for exit handler");
      if (loaded === false) {
        load();
      }
      var ev = "exit";
      if (opts && opts.alwaysLast) {
        ev = "afterexit";
      }
      var remove = function() {
        emitter.removeListener(ev, cb);
        if (emitter.listeners("exit").length === 0 && emitter.listeners("afterexit").length === 0) {
          unload();
        }
      };
      emitter.on(ev, cb);
      return remove;
    };
    unload = function unload() {
      if (!loaded || !processOk(global.process)) {
        return;
      }
      loaded = false;
      signals.forEach(function(sig) {
        try {
          process2.removeListener(sig, sigListeners[sig]);
        } catch (er) {}
      });
      process2.emit = originalProcessEmit;
      process2.reallyExit = originalProcessReallyExit;
      emitter.count -= 1;
    };
    module.exports.unload = unload;
    emit = function emit(event, code, signal) {
      if (emitter.emitted[event]) {
        return;
      }
      emitter.emitted[event] = true;
      emitter.emit(event, code, signal);
    };
    sigListeners = {};
    signals.forEach(function(sig) {
      sigListeners[sig] = function listener() {
        if (!processOk(global.process)) {
          return;
        }
        var listeners = process2.listeners(sig);
        if (listeners.length === emitter.count) {
          unload();
          emit("exit", null, sig);
          emit("afterexit", null, sig);
          if (isWin && sig === "SIGHUP") {
            sig = "SIGINT";
          }
          process2.kill(process2.pid, sig);
        }
      };
    });
    module.exports.signals = function() {
      return signals;
    };
    loaded = false;
    load = function load() {
      if (loaded || !processOk(global.process)) {
        return;
      }
      loaded = true;
      emitter.count += 1;
      signals = signals.filter(function(sig) {
        try {
          process2.on(sig, sigListeners[sig]);
          return true;
        } catch (er) {
          return false;
        }
      });
      process2.emit = processEmit;
      process2.reallyExit = processReallyExit;
    };
    module.exports.load = load;
    originalProcessReallyExit = process2.reallyExit;
    processReallyExit = function processReallyExit(code) {
      if (!processOk(global.process)) {
        return;
      }
      process2.exitCode = code || 0;
      emit("exit", process2.exitCode, null);
      emit("afterexit", process2.exitCode, null);
      originalProcessReallyExit.call(process2, process2.exitCode);
    };
    originalProcessEmit = process2.emit;
    processEmit = function processEmit(ev, arg) {
      if (ev === "exit" && processOk(global.process)) {
        if (arg !== undefined) {
          process2.exitCode = arg;
        }
        var ret = originalProcessEmit.apply(this, arguments);
        emit("exit", process2.exitCode, null);
        emit("afterexit", process2.exitCode, null);
        return ret;
      } else {
        return originalProcessEmit.apply(this, arguments);
      }
    };
  }
  var assert;
  var signals;
  var isWin;
  var EE;
  var emitter;
  var unload;
  var emit;
  var sigListeners;
  var loaded;
  var load;
  var originalProcessReallyExit;
  var processReallyExit;
  var originalProcessEmit;
  var processEmit;
});

// ../../node_modules/.bun/proper-lockfile@4.1.2/node_modules/proper-lockfile/lib/mtime-precision.js
var require_mtime_precision = __commonJS((exports, module) => {
  var cacheSymbol = Symbol();
  function probe(file, fs, callback) {
    const cachedPrecision = fs[cacheSymbol];
    if (cachedPrecision) {
      return fs.stat(file, (err, stat) => {
        if (err) {
          return callback(err);
        }
        callback(null, stat.mtime, cachedPrecision);
      });
    }
    const mtime = new Date(Math.ceil(Date.now() / 1000) * 1000 + 5);
    fs.utimes(file, mtime, mtime, (err) => {
      if (err) {
        return callback(err);
      }
      fs.stat(file, (err2, stat) => {
        if (err2) {
          return callback(err2);
        }
        const precision = stat.mtime.getTime() % 1000 === 0 ? "s" : "ms";
        Object.defineProperty(fs, cacheSymbol, { value: precision });
        callback(null, stat.mtime, precision);
      });
    });
  }
  function getMtime(precision) {
    let now = Date.now();
    if (precision === "s") {
      now = Math.ceil(now / 1000) * 1000;
    }
    return new Date(now);
  }
  exports.probe = probe;
  exports.getMtime = getMtime;
});

// ../../node_modules/.bun/proper-lockfile@4.1.2/node_modules/proper-lockfile/lib/lockfile.js
var require_lockfile = __commonJS((exports, module) => {
  var path = __require("path");
  var fs = require_graceful_fs();
  var retry = require_retry();
  var onExit = require_signal_exit();
  var mtimePrecision = require_mtime_precision();
  var locks = {};
  function getLockFile(file, options) {
    return options.lockfilePath || `${file}.lock`;
  }
  function resolveCanonicalPath(file, options, callback) {
    if (!options.realpath) {
      return callback(null, path.resolve(file));
    }
    options.fs.realpath(file, callback);
  }
  function acquireLock(file, options, callback) {
    const lockfilePath = getLockFile(file, options);
    options.fs.mkdir(lockfilePath, (err) => {
      if (!err) {
        return mtimePrecision.probe(lockfilePath, options.fs, (err2, mtime, mtimePrecision2) => {
          if (err2) {
            options.fs.rmdir(lockfilePath, () => {});
            return callback(err2);
          }
          callback(null, mtime, mtimePrecision2);
        });
      }
      if (err.code !== "EEXIST") {
        return callback(err);
      }
      if (options.stale <= 0) {
        return callback(Object.assign(new Error("Lock file is already being held"), { code: "ELOCKED", file }));
      }
      options.fs.stat(lockfilePath, (err2, stat) => {
        if (err2) {
          if (err2.code === "ENOENT") {
            return acquireLock(file, { ...options, stale: 0 }, callback);
          }
          return callback(err2);
        }
        if (!isLockStale(stat, options)) {
          return callback(Object.assign(new Error("Lock file is already being held"), { code: "ELOCKED", file }));
        }
        removeLock(file, options, (err3) => {
          if (err3) {
            return callback(err3);
          }
          acquireLock(file, { ...options, stale: 0 }, callback);
        });
      });
    });
  }
  function isLockStale(stat, options) {
    return stat.mtime.getTime() < Date.now() - options.stale;
  }
  function removeLock(file, options, callback) {
    options.fs.rmdir(getLockFile(file, options), (err) => {
      if (err && err.code !== "ENOENT") {
        return callback(err);
      }
      callback();
    });
  }
  function updateLock(file, options) {
    const lock2 = locks[file];
    if (lock2.updateTimeout) {
      return;
    }
    lock2.updateDelay = lock2.updateDelay || options.update;
    lock2.updateTimeout = setTimeout(() => {
      lock2.updateTimeout = null;
      options.fs.stat(lock2.lockfilePath, (err, stat) => {
        const isOverThreshold = lock2.lastUpdate + options.stale < Date.now();
        if (err) {
          if (err.code === "ENOENT" || isOverThreshold) {
            return setLockAsCompromised(file, lock2, Object.assign(err, { code: "ECOMPROMISED" }));
          }
          lock2.updateDelay = 1000;
          return updateLock(file, options);
        }
        const isMtimeOurs = lock2.mtime.getTime() === stat.mtime.getTime();
        if (!isMtimeOurs) {
          return setLockAsCompromised(file, lock2, Object.assign(new Error("Unable to update lock within the stale threshold"), { code: "ECOMPROMISED" }));
        }
        const mtime = mtimePrecision.getMtime(lock2.mtimePrecision);
        options.fs.utimes(lock2.lockfilePath, mtime, mtime, (err2) => {
          const isOverThreshold2 = lock2.lastUpdate + options.stale < Date.now();
          if (lock2.released) {
            return;
          }
          if (err2) {
            if (err2.code === "ENOENT" || isOverThreshold2) {
              return setLockAsCompromised(file, lock2, Object.assign(err2, { code: "ECOMPROMISED" }));
            }
            lock2.updateDelay = 1000;
            return updateLock(file, options);
          }
          lock2.mtime = mtime;
          lock2.lastUpdate = Date.now();
          lock2.updateDelay = null;
          updateLock(file, options);
        });
      });
    }, lock2.updateDelay);
    if (lock2.updateTimeout.unref) {
      lock2.updateTimeout.unref();
    }
  }
  function setLockAsCompromised(file, lock2, err) {
    lock2.released = true;
    if (lock2.updateTimeout) {
      clearTimeout(lock2.updateTimeout);
    }
    if (locks[file] === lock2) {
      delete locks[file];
    }
    lock2.options.onCompromised(err);
  }
  function lock(file, options, callback) {
    options = {
      stale: 1e4,
      update: null,
      realpath: true,
      retries: 0,
      fs,
      onCompromised: (err) => {
        throw err;
      },
      ...options
    };
    options.retries = options.retries || 0;
    options.retries = typeof options.retries === "number" ? { retries: options.retries } : options.retries;
    options.stale = Math.max(options.stale || 0, 2000);
    options.update = options.update == null ? options.stale / 2 : options.update || 0;
    options.update = Math.max(Math.min(options.update, options.stale / 2), 1000);
    resolveCanonicalPath(file, options, (err, file2) => {
      if (err) {
        return callback(err);
      }
      const operation = retry.operation(options.retries);
      operation.attempt(() => {
        acquireLock(file2, options, (err2, mtime, mtimePrecision2) => {
          if (operation.retry(err2)) {
            return;
          }
          if (err2) {
            return callback(operation.mainError());
          }
          const lock2 = locks[file2] = {
            lockfilePath: getLockFile(file2, options),
            mtime,
            mtimePrecision: mtimePrecision2,
            options,
            lastUpdate: Date.now()
          };
          updateLock(file2, options);
          callback(null, (releasedCallback) => {
            if (lock2.released) {
              return releasedCallback && releasedCallback(Object.assign(new Error("Lock is already released"), { code: "ERELEASED" }));
            }
            unlock(file2, { ...options, realpath: false }, releasedCallback);
          });
        });
      });
    });
  }
  function unlock(file, options, callback) {
    options = {
      fs,
      realpath: true,
      ...options
    };
    resolveCanonicalPath(file, options, (err, file2) => {
      if (err) {
        return callback(err);
      }
      const lock2 = locks[file2];
      if (!lock2) {
        return callback(Object.assign(new Error("Lock is not acquired/owned by you"), { code: "ENOTACQUIRED" }));
      }
      lock2.updateTimeout && clearTimeout(lock2.updateTimeout);
      lock2.released = true;
      delete locks[file2];
      removeLock(file2, options, callback);
    });
  }
  function check(file, options, callback) {
    options = {
      stale: 1e4,
      realpath: true,
      fs,
      ...options
    };
    options.stale = Math.max(options.stale || 0, 2000);
    resolveCanonicalPath(file, options, (err, file2) => {
      if (err) {
        return callback(err);
      }
      options.fs.stat(getLockFile(file2, options), (err2, stat) => {
        if (err2) {
          return err2.code === "ENOENT" ? callback(null, false) : callback(err2);
        }
        return callback(null, !isLockStale(stat, options));
      });
    });
  }
  function getLocks() {
    return locks;
  }
  onExit(() => {
    for (const file in locks) {
      const options = locks[file].options;
      try {
        options.fs.rmdirSync(getLockFile(file, options));
      } catch (e) {}
    }
  });
  exports.lock = lock;
  exports.unlock = unlock;
  exports.check = check;
  exports.getLocks = getLocks;
});

// ../../node_modules/.bun/proper-lockfile@4.1.2/node_modules/proper-lockfile/lib/adapter.js
var require_adapter = __commonJS((exports, module) => {
  var fs = require_graceful_fs();
  function createSyncFs(fs2) {
    const methods = ["mkdir", "realpath", "stat", "rmdir", "utimes"];
    const newFs = { ...fs2 };
    methods.forEach((method) => {
      newFs[method] = (...args) => {
        const callback = args.pop();
        let ret;
        try {
          ret = fs2[`${method}Sync`](...args);
        } catch (err) {
          return callback(err);
        }
        callback(null, ret);
      };
    });
    return newFs;
  }
  function toPromise(method) {
    return (...args) => new Promise((resolve2, reject) => {
      args.push((err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve2(result);
        }
      });
      method(...args);
    });
  }
  function toSync(method) {
    return (...args) => {
      let err;
      let result;
      args.push((_err, _result) => {
        err = _err;
        result = _result;
      });
      method(...args);
      if (err) {
        throw err;
      }
      return result;
    };
  }
  function toSyncOptions(options) {
    options = { ...options };
    options.fs = createSyncFs(options.fs || fs);
    if (typeof options.retries === "number" && options.retries > 0 || options.retries && typeof options.retries.retries === "number" && options.retries.retries > 0) {
      throw Object.assign(new Error("Cannot use retries with the sync api"), { code: "ESYNC" });
    }
    return options;
  }
  module.exports = {
    toPromise,
    toSync,
    toSyncOptions
  };
});

// ../../node_modules/.bun/proper-lockfile@4.1.2/node_modules/proper-lockfile/index.js
var require_proper_lockfile = __commonJS((exports, module) => {
  var lockfile = require_lockfile();
  var { toPromise, toSync, toSyncOptions } = require_adapter();
  async function lock(file, options) {
    const release = await toPromise(lockfile.lock)(file, options);
    return toPromise(release);
  }
  function lockSync(file, options) {
    const release = toSync(lockfile.lock)(file, toSyncOptions(options));
    return toSync(release);
  }
  function unlock(file, options) {
    return toPromise(lockfile.unlock)(file, options);
  }
  function unlockSync(file, options) {
    return toSync(lockfile.unlock)(file, toSyncOptions(options));
  }
  function check(file, options) {
    return toPromise(lockfile.check)(file, options);
  }
  function checkSync(file, options) {
    return toSync(lockfile.check)(file, toSyncOptions(options));
  }
  module.exports = lock;
  module.exports.lock = lock;
  module.exports.unlock = unlock;
  module.exports.lockSync = lockSync;
  module.exports.unlockSync = unlockSync;
  module.exports.check = check;
  module.exports.checkSync = checkSync;
});

// src/lib/repo.ts
import { existsSync } from "fs";
import { join, dirname, resolve } from "path";
function findRepoRoot(startPath) {
  let current = resolve(startPath || process.cwd());
  const root = dirname(current);
  while (current !== root) {
    if (existsSync(join(current, ".git"))) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current)
      break;
    current = parent;
  }
  if (existsSync(join(current, ".git"))) {
    return current;
  }
  return null;
}
function getRepoRoot(startPath) {
  const root = findRepoRoot(startPath);
  if (!root) {
    throw new Error("Not in a git repository. Run this command from within a git repository, " + "or specify --repo-root explicitly.");
  }
  return root;
}
function getWorkDir(repoRoot) {
  return join(repoRoot, "work");
}
function getIndexPath(repoRoot) {
  return join(getWorkDir(repoRoot), "index.json");
}

// src/lib/index.ts
import { existsSync as existsSync2, readFileSync, writeFileSync, renameSync, rmSync } from "fs";
var lockfile = __toESM(require_proper_lockfile(), 1);
function atomicWriteJSON(path, data) {
  const tempPath = `${path}.tmp`;
  writeFileSync(tempPath, JSON.stringify(data, null, 2));
  renameSync(tempPath, path);
}
function atomicWriteFile(path, content) {
  const tempPath = `${path}.tmp`;
  writeFileSync(tempPath, content);
  renameSync(tempPath, path);
}
function loadIndex(repoRoot) {
  const indexPath = getIndexPath(repoRoot);
  if (!existsSync2(indexPath)) {
    throw new Error(`No workstreams index found at ${indexPath}`);
  }
  const content = readFileSync(indexPath, "utf-8");
  try {
    return JSON.parse(content);
  } catch (e) {
    throw new Error(`Failed to parse index.json at ${indexPath}: ${e instanceof Error ? e.message : String(e)}`);
  }
}
function saveIndex(repoRoot, index) {
  const indexPath = getIndexPath(repoRoot);
  const orderedIndex = {
    version: index.version,
    last_updated: new Date().toISOString(),
    ...index.current_stream !== undefined ? { current_stream: index.current_stream } : {},
    streams: index.streams
  };
  atomicWriteJSON(indexPath, orderedIndex);
}
function findStream(index, streamIdOrName) {
  return index.streams.find((s) => s.id === streamIdOrName || s.name === streamIdOrName);
}
function getStream(index, streamIdOrName) {
  const stream = findStream(index, streamIdOrName);
  if (!stream) {
    throw new Error(`Workstream "${streamIdOrName}" not found`);
  }
  return stream;
}
function resolveStreamId(index, streamIdOrName) {
  if (streamIdOrName === "current") {
    return index.current_stream;
  }
  if (streamIdOrName) {
    return streamIdOrName;
  }
  return index.current_stream;
}

// src/lib/tasks.ts
import { existsSync as existsSync4, readFileSync as readFileSync3, copyFileSync } from "fs";
import { join as join3 } from "path";

// src/lib/threads.ts
var lockfile2 = __toESM(require_proper_lockfile(), 1);
import { existsSync as existsSync3, readFileSync as readFileSync2 } from "fs";
import { join as join2 } from "path";
var THREADS_FILE_VERSION = "1.0.0";
function getThreadsFilePath(repoRoot, streamId) {
  const workDir = getWorkDir(repoRoot);
  return join2(workDir, streamId, "threads.json");
}
function createEmptyThreadsFile(streamId) {
  return {
    version: THREADS_FILE_VERSION,
    stream_id: streamId,
    last_updated: new Date().toISOString(),
    threads: []
  };
}
function loadThreads(repoRoot, streamId) {
  const filePath = getThreadsFilePath(repoRoot, streamId);
  if (!existsSync3(filePath)) {
    return null;
  }
  const content = readFileSync2(filePath, "utf-8");
  return JSON.parse(content);
}
function saveThreads(repoRoot, streamId, threadsFile) {
  const filePath = getThreadsFilePath(repoRoot, streamId);
  threadsFile.last_updated = new Date().toISOString();
  atomicWriteFile(filePath, JSON.stringify(threadsFile, null, 2));
}
function extractThreadIdFromTaskId(taskId) {
  const parts = taskId.split(".");
  if (parts.length !== 4)
    return null;
  return `${parts[0]}.${parts[1]}.${parts[2]}`;
}
function migrateFromTasksJson(repoRoot, streamId, tasksFile) {
  const result = {
    threadsCreated: 0,
    sessionsMigrated: 0,
    errors: []
  };
  let threadsFile = loadThreads(repoRoot, streamId);
  if (!threadsFile) {
    threadsFile = createEmptyThreadsFile(streamId);
  }
  const threadMap = new Map;
  for (const thread of threadsFile.threads) {
    threadMap.set(thread.threadId, thread);
  }
  const tasksByThread = new Map;
  for (const task of tasksFile.tasks) {
    const threadId = extractThreadIdFromTaskId(task.id);
    if (!threadId) {
      result.errors.push(`Invalid task ID format: ${task.id}`);
      continue;
    }
    if (!tasksByThread.has(threadId)) {
      tasksByThread.set(threadId, []);
    }
    tasksByThread.get(threadId).push(task);
  }
  for (const [threadId, tasks] of tasksByThread) {
    let thread = threadMap.get(threadId);
    const isNew = !thread;
    if (!thread) {
      thread = {
        threadId,
        sessions: []
      };
      threadMap.set(threadId, thread);
      result.threadsCreated++;
    }
    for (const task of tasks) {
      if (task.sessions && task.sessions.length > 0) {
        const existingSessionIds = new Set(thread.sessions.map((s) => s.sessionId));
        for (const session of task.sessions) {
          if (!existingSessionIds.has(session.sessionId)) {
            thread.sessions.push(session);
            result.sessionsMigrated++;
          }
        }
      }
      if (!thread.currentSessionId && task.currentSessionId) {
        thread.currentSessionId = task.currentSessionId;
      }
    }
  }
  threadsFile.threads = Array.from(threadMap.values()).sort((a, b) => a.threadId.localeCompare(b.threadId, undefined, { numeric: true }));
  saveThreads(repoRoot, streamId, threadsFile);
  return result;
}

// src/lib/tasks.ts
function getTasksFilePath(repoRoot, streamId) {
  const workDir = getWorkDir(repoRoot);
  return join3(workDir, streamId, "tasks.json");
}
function hasSessionsInTasksJson(tasksFile) {
  return tasksFile.tasks.some((task) => task.sessions && task.sessions.length > 0 || task.currentSessionId);
}
function createTasksJsonBackup(repoRoot, streamId) {
  const filePath = getTasksFilePath(repoRoot, streamId);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = filePath.replace(".json", `.backup-${timestamp}.json`);
  copyFileSync(filePath, backupPath);
  return backupPath;
}
function clearSessionsFromTasks(tasksFile) {
  return {
    ...tasksFile,
    tasks: tasksFile.tasks.map((task) => ({
      ...task,
      sessions: undefined,
      currentSessionId: undefined
    }))
  };
}
function migrateSessionsToThreads(repoRoot, streamId, tasksFile) {
  try {
    if (!hasSessionsInTasksJson(tasksFile)) {
      return { migrated: false };
    }
    const backupPath = createTasksJsonBackup(repoRoot, streamId);
    const result = migrateFromTasksJson(repoRoot, streamId, tasksFile);
    if (result.errors.length > 0) {
      return {
        migrated: false,
        backupPath,
        error: `Migration errors: ${result.errors.join(", ")}`
      };
    }
    const cleanedTasksFile = clearSessionsFromTasks(tasksFile);
    writeTasksFile(repoRoot, streamId, cleanedTasksFile);
    return { migrated: true, backupPath };
  } catch (err) {
    return {
      migrated: false,
      error: err instanceof Error ? err.message : String(err)
    };
  }
}
function readTasksFile(repoRoot, streamId) {
  const filePath = getTasksFilePath(repoRoot, streamId);
  if (!existsSync4(filePath)) {
    return null;
  }
  const content = readFileSync3(filePath, "utf-8");
  let tasksFile = JSON.parse(content);
  if (hasSessionsInTasksJson(tasksFile)) {
    console.warn(`\x1B[33mWarning: Deprecated session data found in tasks.json for stream ${streamId}.\x1B[0m`);
    console.warn(`\x1B[33mAuto-migrating sessions to threads.json and clearing from tasks.json...\x1B[0m`);
    const migrationResult = migrateSessionsToThreads(repoRoot, streamId, tasksFile);
    if (migrationResult.migrated) {
      const cleanedContent = readFileSync3(filePath, "utf-8");
      tasksFile = JSON.parse(cleanedContent);
    }
  }
  return tasksFile;
}
function writeTasksFile(repoRoot, streamId, tasksFile) {
  const filePath = getTasksFilePath(repoRoot, streamId);
  tasksFile.last_updated = new Date().toISOString();
  atomicWriteFile(filePath, JSON.stringify(tasksFile, null, 2));
}
function parseTaskId(taskId) {
  const parts = taskId.split(".");
  if (parts.length === 4) {
    const parsed = parts.map((p) => parseInt(p, 10));
    if (parsed.every((n) => !isNaN(n))) {
      return {
        stage: parsed[0],
        batch: parsed[1],
        thread: parsed[2],
        task: parsed[3]
      };
    }
  }
  throw new Error(`Invalid task ID format: ${taskId}. Expected "stage.batch.thread.task" (e.g., "01.01.02.03")`);
}

// src/lib/github/config.ts
import { join as join4, dirname as dirname2 } from "node:path";
import { readFile, writeFile, rename, mkdir } from "node:fs/promises";
import { exec } from "node:child_process";
import { promisify } from "node:util";

// src/lib/github/types.ts
var DEFAULT_GITHUB_CONFIG = {
  enabled: false,
  owner: "",
  repo: "",
  branch_prefix: "workstream/",
  auto_create_issues: true,
  auto_commit_on_approval: true,
  label_config: {
    workstream: { prefix: "stream:", color: "5319e7" },
    thread: { prefix: "thread:", color: "0e8a16" },
    batch: { prefix: "batch:", color: "0e8a16" },
    stage: { prefix: "stage:", color: "1d76db" }
  }
};

// src/lib/github/config.ts
var execAsync = promisify(exec);
function getGitHubConfigPath(repoRoot) {
  return join4(repoRoot, "work", "github.json");
}
async function loadGitHubConfig(repoRoot) {
  const configPath = getGitHubConfigPath(repoRoot);
  try {
    const content = await readFile(configPath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    if (error.code === "ENOENT") {
      return DEFAULT_GITHUB_CONFIG;
    }
    throw error;
  }
}
async function saveGitHubConfig(repoRoot, config) {
  const configPath = getGitHubConfigPath(repoRoot);
  const tempPath = `${configPath}.tmp`;
  await mkdir(dirname2(configPath), { recursive: true });
  await writeFile(tempPath, JSON.stringify(config, null, 2), "utf-8");
  await rename(tempPath, configPath);
}
async function isGitHubEnabled(repoRoot) {
  const config = await loadGitHubConfig(repoRoot);
  return config.enabled;
}
async function detectRepository(repoRoot) {
  try {
    const { stdout } = await execAsync("git remote get-url origin", { cwd: repoRoot });
    const url = stdout.trim();
    const match = url.match(/github\.com[:/]([^/]+)\/([^/.]+)(?:\.git)?$/);
    if (match && match[1] && match[2]) {
      return { owner: match[1], repo: match[2] };
    }
    return null;
  } catch {
    return null;
  }
}
async function enableGitHub(repoRoot) {
  const config = await loadGitHubConfig(repoRoot);
  const repoInfo = await detectRepository(repoRoot);
  if (!repoInfo) {
    if (!config.owner || !config.repo) {
      throw new Error("Could not detect GitHub repository from 'origin' remote");
    }
  } else {
    config.owner = repoInfo.owner;
    config.repo = repoInfo.repo;
  }
  config.enabled = true;
  await saveGitHubConfig(repoRoot, config);
}
async function disableGitHub(repoRoot) {
  const config = await loadGitHubConfig(repoRoot);
  config.enabled = false;
  await saveGitHubConfig(repoRoot, config);
}

// src/lib/github/auth.ts
import { execSync } from "node:child_process";
function getAuthFromEnv() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (process.env.DEBUG_AUTH) {
    console.log(`[auth] GITHUB_TOKEN: ${process.env.GITHUB_TOKEN ? `set (${process.env.GITHUB_TOKEN.substring(0, 15)}...)` : "not set"}`);
    console.log(`[auth] GH_TOKEN: ${process.env.GH_TOKEN ? `set (${process.env.GH_TOKEN.substring(0, 15)}...)` : "not set"}`);
    console.log(`[auth] Using: ${process.env.GITHUB_TOKEN ? "GITHUB_TOKEN" : "GH_TOKEN"}`);
  }
  return token;
}
function getAuthFromGhCli() {
  try {
    const token = execSync("gh auth token", { encoding: "utf-8" }).trim();
    return token || undefined;
  } catch {
    return;
  }
}
function getGitHubAuth() {
  return getAuthFromEnv() || getAuthFromGhCli();
}

class GitHubAuthError extends Error {
  constructor(message) {
    super(message);
    this.name = "GitHubAuthError";
  }
}
async function ensureGitHubAuth(owner, repo) {
  const token = getGitHubAuth();
  if (!token) {
    throw new GitHubAuthError("No GitHub authentication found. Please set GITHUB_TOKEN/GH_TOKEN or login via 'gh auth login'.");
  }
  const isValid = await validateAuth(token, owner, repo);
  if (!isValid) {
    throw new GitHubAuthError("Invalid GitHub authentication token.");
  }
  return token;
}
async function validateAuth(token, owner, repo) {
  try {
    const url = owner && repo ? `https://api.github.com/repos/${owner}/${repo}` : "https://api.github.com/rate_limit";
    if (process.env.DEBUG_AUTH) {
      console.log(`[auth] Validating against: ${url}`);
    }
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "opencode-agent"
      }
    });
    if (process.env.DEBUG_AUTH) {
      console.log(`[auth] Response status: ${response.status}`);
    }
    return response.ok;
  } catch (error) {
    if (process.env.DEBUG_AUTH) {
      console.log(`[auth] Fetch error: ${error}`);
    }
    return false;
  }
}

// src/lib/github/branches.ts
import { execSync as execSync2 } from "node:child_process";

// src/lib/github/client.ts
class GitHubClient {
  token;
  repository;
  baseUrl = "https://api.github.com";
  constructor(token, repository) {
    this.token = token;
    this.repository = repository;
  }
  async request(path, options = {}) {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github.v3+json"
    };
    const response = await fetch(url, {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    if (!response.ok) {
      let errorBody = "";
      try {
        errorBody = await response.text();
      } catch {
        errorBody = "(unable to read error body)";
      }
      throw new Error(`GitHub API error: ${response.status} ${response.statusText} - ${errorBody}`);
    }
    if (response.status === 204) {
      return {};
    }
    return response.json();
  }
  async createIssue(title, body, labels = []) {
    return this.request(`/repos/${this.repository.owner}/${this.repository.repo}/issues`, {
      method: "POST",
      body: { title, body, labels }
    });
  }
  async updateIssue(issueNumber, updates) {
    return this.request(`/repos/${this.repository.owner}/${this.repository.repo}/issues/${issueNumber}`, {
      method: "PATCH",
      body: updates
    });
  }
  async closeIssue(issueNumber) {
    return this.updateIssue(issueNumber, { state: "closed" });
  }
  async reopenIssue(issueNumber) {
    return this.updateIssue(issueNumber, { state: "open" });
  }
  async getIssue(issueNumber) {
    return this.request(`/repos/${this.repository.owner}/${this.repository.repo}/issues/${issueNumber}`);
  }
  async searchIssues(query) {
    const queryParts = [
      `repo:${this.repository.owner}/${this.repository.repo}`,
      "is:issue"
    ];
    if (query.state && query.state !== "all") {
      queryParts.push(`state:${query.state}`);
    }
    if (query.labels && query.labels.length > 0) {
      for (const label of query.labels) {
        queryParts.push(`label:"${label}"`);
      }
    }
    if (query.title) {
      queryParts.push(`"${query.title.replace(/"/g, "\\\"")}" in:title`);
    }
    const searchQuery = queryParts.join(" ");
    const encodedQuery = encodeURIComponent(searchQuery);
    const response = await this.request(`/search/issues?q=${encodedQuery}&per_page=100`);
    return response.items || [];
  }
  async createLabel(name, color, description) {
    return this.request(`/repos/${this.repository.owner}/${this.repository.repo}/labels`, {
      method: "POST",
      body: { name, color, description }
    });
  }
  async ensureLabels(labels) {
    const existingLabels = await this.request(`/repos/${this.repository.owner}/${this.repository.repo}/labels?per_page=100`);
    const existingNames = new Set(existingLabels.map((l) => l.name));
    for (const label of labels) {
      if (!existingNames.has(label.name)) {
        await this.createLabel(label.name, label.color, label.description);
      }
    }
  }
  async getBranch(branch) {
    return this.request(`/repos/${this.repository.owner}/${this.repository.repo}/branches/${branch}`);
  }
  async createBranch(name, fromBranch) {
    const base = await this.getBranch(fromBranch);
    return this.request(`/repos/${this.repository.owner}/${this.repository.repo}/git/refs`, {
      method: "POST",
      body: {
        ref: `refs/heads/${name}`,
        sha: base.commit.sha
      }
    });
  }
  async createPullRequest(title, body, head, base, draft = false) {
    return this.request(`/repos/${this.repository.owner}/${this.repository.repo}/pulls`, {
      method: "POST",
      body: { title, body, head, base, draft }
    });
  }
}
var createGitHubClient = (token, owner, repo) => {
  return new GitHubClient(token, { owner, repo });
};

// src/lib/github/branches.ts
function formatBranchName(config, streamId) {
  const prefix = config.branch_prefix || "workstream/";
  return `${prefix}${streamId}`;
}
function localBranchExists(repoRoot, branchName) {
  try {
    execSync2(`git rev-parse --verify ${branchName}`, {
      cwd: repoRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"]
    });
    return true;
  } catch {
    return false;
  }
}
function deleteLocalBranchIfExists(repoRoot, branchName) {
  if (!localBranchExists(repoRoot, branchName)) {
    return;
  }
  execSync2(`git branch -D ${branchName}`, {
    cwd: repoRoot,
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"]
  });
}
function deleteRemoteBranchIfExists(repoRoot, branchName) {
  try {
    execSync2(`git push origin --delete ${branchName}`, {
      cwd: repoRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"]
    });
  } catch {}
}
async function createWorkstreamBranch(repoRoot, streamId, fromRef) {
  const config = await loadGitHubConfig(repoRoot);
  if (!config.enabled) {
    throw new Error("GitHub integration is not enabled. Run 'work github enable' first.");
  }
  if (!config.owner || !config.repo) {
    throw new Error("GitHub repository not configured. Run 'work github enable' first.");
  }
  const branchName = formatBranchName(config, streamId);
  await storeWorkstreamBranchMeta(repoRoot, streamId, branchName);
  commitPendingChanges(repoRoot);
  deleteLocalBranchIfExists(repoRoot, branchName);
  deleteRemoteBranchIfExists(repoRoot, branchName);
  execSync2(`git checkout -b ${branchName}`, {
    cwd: repoRoot,
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"]
  });
  execSync2(`git push -u origin ${branchName}`, {
    cwd: repoRoot,
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"]
  });
  const sha = execSync2("git rev-parse HEAD", {
    cwd: repoRoot,
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"]
  }).trim();
  return {
    branchName,
    sha,
    url: `https://github.com/${config.owner}/${config.repo}/tree/${branchName}`
  };
}
function commitPendingChanges(repoRoot) {
  execSync2("git add -A", {
    cwd: repoRoot,
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"]
  });
  const stagedFiles = execSync2("git diff --cached --name-only", {
    cwd: repoRoot,
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"]
  }).trim();
  if (!stagedFiles) {
    return false;
  }
  execSync2('git commit -m "workstream start"', {
    cwd: repoRoot,
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"]
  });
  return true;
}
async function storeWorkstreamBranchMeta(repoRoot, streamId, branchName) {
  const index = loadIndex(repoRoot);
  const streamIndex = index.streams.findIndex((s) => s.id === streamId || s.name === streamId);
  if (streamIndex === -1) {
    throw new Error(`Workstream "${streamId}" not found`);
  }
  const stream = index.streams[streamIndex];
  stream.github = {
    ...stream.github,
    branch: branchName
  };
  stream.updated_at = new Date().toISOString();
  saveIndex(repoRoot, index);
}

// src/lib/github/labels.ts
function sanitizeLabelName(value) {
  return value.replace(/,/g, "").replace(/\s+/g, " ").trim();
}
function formatLabel(prefix, value) {
  const sanitized = sanitizeLabelName(value);
  const label = `${prefix}${sanitized}`;
  return label.length > 50 ? label.slice(0, 50) : label;
}
async function ensureWorkstreamLabels(repoRoot, streamId) {
  if (!await isGitHubEnabled(repoRoot)) {
    return;
  }
  const config = await loadGitHubConfig(repoRoot);
  if (!config.owner || !config.repo) {
    throw new Error("GitHub integration enabled but owner/repo not configured");
  }
  const token = await ensureGitHubAuth();
  const client = createGitHubClient(token, config.owner, config.repo);
  const index = loadIndex(repoRoot);
  const stream = getStream(index, streamId);
  const labelsToCreate = [];
  const streamLabel = formatLabel(config.label_config.workstream.prefix, stream.name);
  labelsToCreate.push({
    name: streamLabel,
    color: config.label_config.workstream.color,
    description: `Workstream: ${stream.name}`
  });
  const tasksFile = readTasksFile(repoRoot, streamId);
  if (tasksFile) {
    const stages = new Map;
    const batches = new Map;
    for (const task of tasksFile.tasks) {
      try {
        const { stage, batch } = parseTaskId(task.id);
        const stageId = stage.toString().padStart(2, "0");
        const batchId = `${stageId}.${batch.toString().padStart(2, "0")}`;
        if (!stages.has(stageId)) {
          stages.set(stageId, { id: stageId, name: task.stage_name });
        }
        if (!batches.has(batchId)) {
          batches.set(batchId, { id: batchId, name: task.batch_name });
        }
      } catch (e) {
        continue;
      }
    }
    for (const { id, name } of stages.values()) {
      const labelName = formatLabel(config.label_config.stage.prefix, `${id}-${name}`);
      labelsToCreate.push({
        name: labelName,
        color: config.label_config.stage.color,
        description: `Stage ${id}: ${name}`
      });
    }
    for (const { id, name } of batches.values()) {
      const labelName = formatLabel(config.label_config.batch.prefix, `${id}-${name}`);
      labelsToCreate.push({
        name: labelName,
        color: config.label_config.batch.color,
        description: `Batch ${id}: ${name}`
      });
    }
  }
  await client.ensureLabels(labelsToCreate);
}

// src/lib/github/issues.ts
function formatStageIssueTitle(streamId, stageNumber, stageName) {
  const stageId = stageNumber.toString().padStart(2, "0");
  return `[${streamId}] Stage ${stageId}: ${stageName}`;
}
function formatStageIssueBody(input) {
  const stageId = input.stageNumber.toString().padStart(2, "0");
  let body = `**Workstream:** ${input.streamName} (\`${input.streamId}\`)
**Stage:** ${stageId} - ${input.stageName}

## Batches

`;
  for (const batch of input.batches) {
    body += `### Batch ${batch.batchId}: ${batch.batchName}

`;
    for (const thread of batch.threads) {
      body += `#### Thread ${thread.threadId}: ${thread.threadName}

`;
      for (const task of thread.tasks) {
        const checkbox = task.status === "completed" || task.status === "cancelled" ? "[x]" : "[ ]";
        const suffix = task.status === "cancelled" ? " *(cancelled)*" : "";
        body += `- ${checkbox} \`${task.taskId}\` ${task.taskName}${suffix}
`;
      }
      body += `
`;
    }
  }
  return body.trim();
}
function getStageLabels(config, streamName, stageId, stageName) {
  const { label_config } = config;
  const streamLabel = formatLabel(label_config.workstream.prefix, streamName);
  const stageLabel = formatLabel(label_config.stage.prefix, `${stageId}-${stageName}`);
  return [streamLabel, stageLabel];
}
async function createStageIssue(repoRoot, input) {
  const enabled = await isGitHubEnabled(repoRoot);
  if (!enabled) {
    return null;
  }
  const config = await loadGitHubConfig(repoRoot);
  if (!config.owner || !config.repo) {
    return null;
  }
  const token = getGitHubAuth();
  if (!token) {
    throw new Error("GitHub authentication failed. Please check your token.");
  }
  const client = createGitHubClient(token, config.owner, config.repo);
  const title = formatStageIssueTitle(input.streamId, input.stageNumber, input.stageName);
  const body = formatStageIssueBody(input);
  const stageId = input.stageNumber.toString().padStart(2, "0");
  const labels = getStageLabels(config, input.streamName, stageId, input.stageName);
  const issue = await client.createIssue(title, body, labels);
  return {
    issue_number: issue.number,
    issue_url: issue.html_url,
    state: "open",
    created_at: new Date().toISOString()
  };
}
async function findExistingStageIssue(repoRoot, streamId, stageNumber, stageName) {
  const enabled = await isGitHubEnabled(repoRoot);
  if (!enabled) {
    return null;
  }
  const config = await loadGitHubConfig(repoRoot);
  if (!config.owner || !config.repo) {
    return null;
  }
  const token = getGitHubAuth();
  if (!token) {
    return null;
  }
  const client = createGitHubClient(token, config.owner, config.repo);
  const expectedTitle = formatStageIssueTitle(streamId, stageNumber, stageName);
  try {
    const issues = await client.searchIssues({
      title: expectedTitle,
      state: "all"
    });
    const matchingIssue = issues.find((issue) => issue.title === expectedTitle);
    if (matchingIssue) {
      return {
        issueNumber: matchingIssue.number,
        issueUrl: matchingIssue.html_url,
        state: matchingIssue.state === "closed" ? "closed" : "open"
      };
    }
  } catch (error) {
    console.error("Failed to search for existing stage issues:", error);
  }
  return null;
}
async function reopenStageIssue(repoRoot, issueNumber) {
  const enabled = await isGitHubEnabled(repoRoot);
  if (!enabled)
    return;
  const config = await loadGitHubConfig(repoRoot);
  if (!config.owner || !config.repo)
    return;
  const token = getGitHubAuth();
  if (!token)
    return;
  const client = createGitHubClient(token, config.owner, config.repo);
  await client.reopenIssue(issueNumber);
}

// src/lib/github/workstream-github.ts
import { join as join5, dirname as dirname3 } from "node:path";
import { readFile as readFile2, writeFile as writeFile2, rename as rename2, mkdir as mkdir2 } from "node:fs/promises";
function getWorkstreamGitHubPath(repoRoot, streamId) {
  return join5(getWorkDir(repoRoot), streamId, "github.json");
}
async function loadWorkstreamGitHub(repoRoot, streamId) {
  const configPath = getWorkstreamGitHubPath(repoRoot, streamId);
  try {
    const content = await readFile2(configPath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}
async function saveWorkstreamGitHub(repoRoot, streamId, data) {
  const configPath = getWorkstreamGitHubPath(repoRoot, streamId);
  const tempPath = `${configPath}.tmp`;
  await mkdir2(dirname3(configPath), { recursive: true });
  data.last_updated = new Date().toISOString();
  await writeFile2(tempPath, JSON.stringify(data, null, 2), "utf-8");
  await rename2(tempPath, configPath);
}
async function initWorkstreamGitHub(repoRoot, streamId) {
  const data = {
    version: "1.0.0",
    stream_id: streamId,
    last_updated: new Date().toISOString(),
    stages: {}
  };
  await saveWorkstreamGitHub(repoRoot, streamId, data);
  return data;
}
function getStageIssue(data, stageNumber) {
  return data.stages[stageNumber];
}
function setStageIssue(data, stageNumber, issue) {
  data.stages[stageNumber] = issue;
}
function updateStageIssueState(data, stageNumber, state, closedAt) {
  const issue = data.stages[stageNumber];
  if (issue) {
    issue.state = state;
    if (state === "closed" && closedAt) {
      issue.closed_at = closedAt;
    } else if (state === "open") {
      delete issue.closed_at;
    }
  }
}

// src/lib/github/sync.ts
function isStageComplete(repoRoot, streamId, stageNumber) {
  const tasksFile = readTasksFile(repoRoot, streamId);
  if (!tasksFile)
    return false;
  const stagePrefix = `${stageNumber.toString().padStart(2, "0")}.`;
  const stageTasks = tasksFile.tasks.filter((t) => t.id.startsWith(stagePrefix));
  if (stageTasks.length === 0)
    return false;
  return stageTasks.every((t) => t.status === "completed" || t.status === "cancelled");
}
function getStageName(repoRoot, streamId, stageNumber) {
  const tasksFile = readTasksFile(repoRoot, streamId);
  if (!tasksFile)
    return null;
  const stagePrefix = `${stageNumber.toString().padStart(2, "0")}.`;
  const firstTask = tasksFile.tasks.find((t) => t.id.startsWith(stagePrefix));
  return firstTask?.stage_name || null;
}
async function syncStageIssues(repoRoot, streamId) {
  const result = {
    closed: [],
    unchanged: [],
    errors: []
  };
  const enabled = await isGitHubEnabled(repoRoot);
  if (!enabled) {
    return result;
  }
  const config = await loadGitHubConfig(repoRoot);
  if (!config.owner || !config.repo) {
    return result;
  }
  let githubData = await loadWorkstreamGitHub(repoRoot, streamId);
  if (!githubData) {
    return result;
  }
  const token = getGitHubAuth();
  if (!token) {
    return result;
  }
  const client = createGitHubClient(token, config.owner, config.repo);
  let needsSave = false;
  for (const [stageNumber, stageIssue] of Object.entries(githubData.stages)) {
    const stageName = getStageName(repoRoot, streamId, parseInt(stageNumber, 10)) || `Stage ${stageNumber}`;
    if (stageIssue.state === "closed") {
      result.unchanged.push({
        stageNumber,
        stageName,
        issueNumber: stageIssue.issue_number,
        reason: "Issue already closed"
      });
      continue;
    }
    const stageNum = parseInt(stageNumber, 10);
    const isComplete = isStageComplete(repoRoot, streamId, stageNum);
    if (!isComplete) {
      result.unchanged.push({
        stageNumber,
        stageName,
        issueNumber: stageIssue.issue_number,
        reason: "Stage has incomplete tasks"
      });
      continue;
    }
    try {
      await client.closeIssue(stageIssue.issue_number);
      const closedAt = new Date().toISOString();
      updateStageIssueState(githubData, stageNumber, "closed", closedAt);
      needsSave = true;
      result.closed.push({
        stageNumber,
        stageName,
        issueNumber: stageIssue.issue_number,
        issueUrl: stageIssue.issue_url
      });
    } catch (error) {
      result.errors.push({
        stageNumber,
        stageName,
        issueNumber: stageIssue.issue_number,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  if (needsSave) {
    await saveWorkstreamGitHub(repoRoot, streamId, githubData);
  }
  return result;
}

// src/cli/github.ts
var SUBCOMMANDS = ["enable", "disable", "status", "create-branch", "create-issues", "sync"];
function printHelp() {
  console.log(`
work github - GitHub integration management

Usage:
  work github <subcommand> [options]

Subcommands:
  enable        Enable GitHub integration (auto-detects repo)
  disable       Disable GitHub integration
  status        Show config and auth status
  create-branch Create workstream branch on GitHub
  create-issues Create issues for stages
  sync          Sync issue states with local task status

Run 'work github <subcommand> --help' for more information on a subcommand.
`);
}
function printEnableHelp() {
  console.log(`
work github enable - Enable GitHub integration

Usage:
  work github enable [options]

Options:
  --repo-root, -r  Repository root (auto-detected if omitted)
  --help, -h       Show this help message

Description:
  Enables GitHub integration by auto-detecting the repository from the
  git remote 'origin'. Saves configuration to work/github.json.

Examples:
  # Enable GitHub integration
  work github enable
`);
}
function printDisableHelp() {
  console.log(`
work github disable - Disable GitHub integration

Usage:
  work github disable [options]

Options:
  --repo-root, -r  Repository root (auto-detected if omitted)
  --help, -h       Show this help message

Description:
  Disables GitHub integration. Configuration is preserved but integration
  is marked as disabled.

Examples:
  # Disable GitHub integration
  work github disable
`);
}
function printStatusHelp() {
  console.log(`
work github status - Show GitHub integration status

Usage:
  work github status [options]

Options:
  --repo-root, -r  Repository root (auto-detected if omitted)
  --help, -h       Show this help message

Description:
  Shows the current GitHub integration configuration, authentication
  status, and repository information.

Examples:
  # Show GitHub integration status
  work github status
`);
}
function printCreateIssuesHelp() {
  console.log(`
work github create-issues - Create GitHub issues for stages

Usage:
  work github create-issues [options]

Options:
  --stream, -s   Workstream ID or name (uses current if omitted)
  --stage, -st   Create issue for a specific stage (e.g., 1)
  --json, -j     Output as JSON
  --help, -h     Show this help message

Description:
  Creates GitHub issues for workstream stages. Each stage gets one issue
  that tracks all batches, threads, and tasks within that stage.

  Issue title format: [{stream-id}] Stage {N}: {Stage Name}

  When no stage filter is specified, creates issues for all stages that
  don't already have an issue.

Examples:
  # Create issue for stage 1
  work github create-issues --stage 1

  # Create issues for all stages without issues
  work github create-issues

  # Create issues for specific workstream
  work github create-issues --stream "002-github-integration" --stage 1
`);
}
function printCreateBranchHelp() {
  console.log(`
work github create-branch - Create workstream branch on GitHub

Usage:
  work github create-branch [options]

Options:
  --stream, -s   Workstream ID or name (uses current if omitted)
  --from, -f     Base branch to create from (default: main)
  --help, -h     Show this help message

Examples:
  # Create branch for current workstream
  work github create-branch

  # Create branch for specific workstream
  work github create-branch --stream "002-github-integration"

  # Create branch from specific base
  work github create-branch --from develop
`);
}
function printSyncHelp() {
  console.log(`
work github sync - Sync stage issue states with local task status

Usage:
  work github sync [options]

Options:
  --stream, -s   Workstream ID or name (uses current if omitted)
  --json, -j     Output as JSON
  --help, -h     Show this help message

Description:
  Synchronizes GitHub stage issue states with local task status. For stages
  where all tasks are completed/cancelled, this command closes the stage
  issue and updates the state in github.json.

  Reports: "Closed N stage issues, M unchanged"

Examples:
  # Sync all issue states for current workstream
  work github sync

  # Sync for specific workstream
  work github sync --stream "002-github-integration"

  # Output as JSON
  work github sync --json
`);
}
function groupTasksByStage(tasks) {
  const stages = new Map;
  for (const task of tasks) {
    const { stage, batch, thread } = parseTaskId(task.id);
    const stageId = stage.toString().padStart(2, "0");
    const batchId = batch.toString().padStart(2, "0");
    const threadId = thread.toString().padStart(2, "0");
    if (!stages.has(stage)) {
      stages.set(stage, {
        stageNumber: stage,
        stageId,
        stageName: task.stage_name,
        batches: new Map
      });
    }
    const stageInfo = stages.get(stage);
    const batchKey = `${stageId}.${batchId}`;
    if (!stageInfo.batches.has(batchKey)) {
      stageInfo.batches.set(batchKey, {
        batchId: batchKey,
        batchName: task.batch_name,
        threads: new Map
      });
    }
    const batchInfo = stageInfo.batches.get(batchKey);
    const threadKey = `${stageId}.${batchId}.${threadId}`;
    if (!batchInfo.threads.has(threadKey)) {
      batchInfo.threads.set(threadKey, {
        threadId: threadKey,
        threadName: task.thread_name,
        tasks: []
      });
    }
    batchInfo.threads.get(threadKey).tasks.push(task);
  }
  return stages;
}
function stageInfoToInput(stageInfo, streamId, streamName) {
  const batches = [];
  const sortedBatches = Array.from(stageInfo.batches.entries()).sort(([a], [b]) => a.localeCompare(b));
  for (const [, batchInfo] of sortedBatches) {
    const threads = [];
    const sortedThreads = Array.from(batchInfo.threads.entries()).sort(([a], [b]) => a.localeCompare(b));
    for (const [, threadInfo] of sortedThreads) {
      const sortedTasks = threadInfo.tasks.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
      const tasks = sortedTasks.map((t) => ({
        taskId: t.id,
        taskName: t.name,
        status: t.status
      }));
      threads.push({
        threadId: threadInfo.threadId,
        threadName: threadInfo.threadName,
        tasks
      });
    }
    batches.push({
      batchId: batchInfo.batchId,
      batchName: batchInfo.batchName,
      threads
    });
  }
  return {
    streamId,
    streamName,
    stageNumber: stageInfo.stageNumber,
    stageName: stageInfo.stageName,
    batches
  };
}
function isStageComplete2(stageInfo) {
  for (const batch of stageInfo.batches.values()) {
    for (const thread of batch.threads.values()) {
      for (const task of thread.tasks) {
        if (task.status !== "completed" && task.status !== "cancelled") {
          return false;
        }
      }
    }
  }
  return true;
}
async function createIssuesForStages(repoRoot, streamId, streamName, stages, stageFilter) {
  const result = {
    created: [],
    skipped: [],
    reopened: [],
    failed: []
  };
  await ensureWorkstreamLabels(repoRoot, streamId);
  let githubData = await loadWorkstreamGitHub(repoRoot, streamId);
  if (!githubData) {
    githubData = await initWorkstreamGitHub(repoRoot, streamId);
  }
  let stagesToProcess;
  if (stageFilter !== undefined) {
    const stageInfo = stages.get(stageFilter);
    stagesToProcess = stageInfo ? new Map([[stageFilter, stageInfo]]) : new Map;
  } else {
    stagesToProcess = stages;
  }
  const sortedStages = Array.from(stagesToProcess.entries()).sort(([a], [b]) => a - b);
  for (const [stageNumber, stageInfo] of sortedStages) {
    const stageId = stageNumber.toString().padStart(2, "0");
    try {
      const existingLocal = getStageIssue(githubData, stageId);
      const isComplete = isStageComplete2(stageInfo);
      const existingRemote = await findExistingStageIssue(repoRoot, streamId, stageNumber, stageInfo.stageName);
      if (existingLocal) {
        if (existingLocal.state === "closed" && !isComplete) {
          try {
            await reopenStageIssue(repoRoot, existingLocal.issue_number);
            existingLocal.state = "open";
            delete existingLocal.closed_at;
            await saveWorkstreamGitHub(repoRoot, streamId, githubData);
            result.reopened.push({
              stageNumber,
              stageName: stageInfo.stageName,
              issueUrl: existingLocal.issue_url,
              issueNumber: existingLocal.issue_number
            });
          } catch (error) {
            result.failed.push({
              stageNumber,
              stageName: stageInfo.stageName,
              error: `Failed to reopen issue: ${error instanceof Error ? error.message : String(error)}`
            });
          }
        } else {
          result.skipped.push({
            stageNumber,
            stageName: stageInfo.stageName,
            reason: `Issue #${existingLocal.issue_number} already exists (${existingLocal.state})`
          });
        }
        continue;
      }
      if (existingRemote) {
        const stageIssue2 = {
          issue_number: existingRemote.issueNumber,
          issue_url: existingRemote.issueUrl,
          state: existingRemote.state,
          created_at: new Date().toISOString()
        };
        if (existingRemote.state === "closed") {
          stageIssue2.closed_at = new Date().toISOString();
        }
        setStageIssue(githubData, stageId, stageIssue2);
        await saveWorkstreamGitHub(repoRoot, streamId, githubData);
        if (existingRemote.state === "closed" && !isComplete) {
          try {
            await reopenStageIssue(repoRoot, existingRemote.issueNumber);
            stageIssue2.state = "open";
            delete stageIssue2.closed_at;
            await saveWorkstreamGitHub(repoRoot, streamId, githubData);
            result.reopened.push({
              stageNumber,
              stageName: stageInfo.stageName,
              issueUrl: existingRemote.issueUrl,
              issueNumber: existingRemote.issueNumber
            });
          } catch (error) {
            result.failed.push({
              stageNumber,
              stageName: stageInfo.stageName,
              error: `Failed to reopen issue: ${error instanceof Error ? error.message : String(error)}`
            });
          }
        } else {
          result.skipped.push({
            stageNumber,
            stageName: stageInfo.stageName,
            reason: `Existing issue #${existingRemote.issueNumber} found on GitHub (${existingRemote.state})`
          });
        }
        continue;
      }
      if (isComplete) {
        result.skipped.push({
          stageNumber,
          stageName: stageInfo.stageName,
          reason: "Stage already complete, no issue needed"
        });
        continue;
      }
      const input = stageInfoToInput(stageInfo, streamId, streamName);
      const stageIssue = await createStageIssue(repoRoot, input);
      if (stageIssue) {
        setStageIssue(githubData, stageId, stageIssue);
        await saveWorkstreamGitHub(repoRoot, streamId, githubData);
        result.created.push({
          stageNumber,
          stageName: stageInfo.stageName,
          issueUrl: stageIssue.issue_url,
          issueNumber: stageIssue.issue_number
        });
      } else {
        result.skipped.push({
          stageNumber,
          stageName: stageInfo.stageName,
          reason: "GitHub integration not enabled or configured"
        });
      }
    } catch (error) {
      result.failed.push({
        stageNumber,
        stageName: stageInfo.stageName,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  return result;
}
function parseCreateBranchArgs(argv) {
  const args = argv.slice(3);
  const parsed = {};
  for (let i = 0;i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];
    switch (arg) {
      case "--repo-root":
      case "-r":
        if (!next) {
          console.error("Error: --repo-root requires a value");
          return null;
        }
        parsed.repoRoot = next;
        i++;
        break;
      case "--stream":
      case "-s":
        if (!next) {
          console.error("Error: --stream requires a value");
          return null;
        }
        parsed.streamId = next;
        i++;
        break;
      case "--from":
      case "-f":
        if (!next) {
          console.error("Error: --from requires a value");
          return null;
        }
        parsed.fromRef = next;
        i++;
        break;
      case "--help":
      case "-h":
        printCreateBranchHelp();
        process.exit(0);
    }
  }
  return parsed;
}
async function createBranchCommand(argv) {
  const cliArgs = parseCreateBranchArgs(argv);
  if (!cliArgs) {
    console.error(`
Run 'work github create-branch --help' for usage information.`);
    process.exit(1);
  }
  let repoRoot;
  try {
    repoRoot = cliArgs.repoRoot ?? getRepoRoot();
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  const enabled = await isGitHubEnabled(repoRoot);
  if (!enabled) {
    console.error("Error: GitHub integration is not enabled.");
    console.error("Run 'work github enable' first.");
    process.exit(1);
  }
  let index;
  try {
    index = loadIndex(repoRoot);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  const resolvedStreamId = resolveStreamId(index, cliArgs.streamId);
  if (!resolvedStreamId) {
    console.error("Error: No workstream specified and no current workstream set.");
    console.error("Use --stream to specify a workstream, or run 'work current --set <stream>'");
    process.exit(1);
  }
  const stream = index.streams.find((s) => s.id === resolvedStreamId || s.name === resolvedStreamId);
  if (!stream) {
    console.error(`Error: Workstream "${resolvedStreamId}" not found`);
    process.exit(1);
  }
  if (stream.github?.branch) {
    console.log(`Branch already exists: ${stream.github.branch}`);
    console.log("To checkout, run:");
    console.log(`  git checkout ${stream.github.branch}`);
    return;
  }
  console.log(`Creating branch for workstream: ${stream.id}`);
  if (cliArgs.fromRef) {
    console.log(`Base branch: ${cliArgs.fromRef}`);
  }
  try {
    const result = await createWorkstreamBranch(repoRoot, stream.id, cliArgs.fromRef);
    console.log("");
    console.log("Branch created and checked out successfully!");
    console.log("");
    console.log(`  Branch: ${result.branchName}`);
    console.log(`  SHA:    ${result.sha.substring(0, 7)}`);
    console.log(`  URL:    ${result.url}`);
    console.log("");
    console.log("You are now on the workstream branch.");
  } catch (e) {
    const error = e;
    console.error(`Error creating branch: ${error.message}`);
    process.exit(1);
  }
}
function parseCreateIssuesArgs(argv) {
  const args = argv.slice(3);
  const parsed = { json: false };
  for (let i = 0;i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];
    switch (arg) {
      case "--repo-root":
      case "-r":
        if (!next) {
          console.error("Error: --repo-root requires a value");
          return null;
        }
        parsed.repoRoot = next;
        i++;
        break;
      case "--stream":
      case "-s":
        if (!next) {
          console.error("Error: --stream requires a value");
          return null;
        }
        parsed.streamId = next;
        i++;
        break;
      case "--stage":
      case "-st":
        if (!next) {
          console.error("Error: --stage requires a value");
          return null;
        }
        parsed.stage = parseInt(next, 10);
        if (isNaN(parsed.stage)) {
          console.error("Error: --stage must be a number");
          return null;
        }
        i++;
        break;
      case "--json":
      case "-j":
        parsed.json = true;
        break;
      case "--help":
      case "-h":
        printCreateIssuesHelp();
        process.exit(0);
    }
  }
  return parsed;
}
async function createIssuesCommand(argv) {
  const cliArgs = parseCreateIssuesArgs(argv);
  if (!cliArgs) {
    console.error(`
Run 'work github create-issues --help' for usage information.`);
    process.exit(1);
  }
  let repoRoot;
  try {
    repoRoot = cliArgs.repoRoot ?? getRepoRoot();
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  const enabled = await isGitHubEnabled(repoRoot);
  if (!enabled) {
    console.error("Error: GitHub integration is not enabled");
    console.error("Run 'work github enable' to enable it");
    process.exit(1);
  }
  try {
    await ensureGitHubAuth();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
  let index;
  try {
    index = loadIndex(repoRoot);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  const resolvedStreamId = resolveStreamId(index, cliArgs.streamId);
  if (!resolvedStreamId) {
    console.error("Error: No workstream specified and no current workstream set.");
    console.error("Use --stream to specify a workstream, or run 'work current --set <stream>'");
    process.exit(1);
  }
  const stream = getStream(index, resolvedStreamId);
  const tasksFile = readTasksFile(repoRoot, stream.id);
  if (!tasksFile || tasksFile.tasks.length === 0) {
    console.error("Error: No tasks found for workstream");
    process.exit(1);
  }
  const stages = groupTasksByStage(tasksFile.tasks);
  if (cliArgs.stage !== undefined && !stages.has(cliArgs.stage)) {
    console.error(`Error: No tasks found for stage ${cliArgs.stage}`);
    process.exit(1);
  }
  const result = await createIssuesForStages(repoRoot, stream.id, stream.name, stages, cliArgs.stage);
  if (cliArgs.json) {
    console.log(JSON.stringify({
      streamId: stream.id,
      streamName: stream.name,
      ...result
    }, null, 2));
  } else {
    if (result.created.length > 0) {
      console.log(`Created ${result.created.length} stage issue(s):`);
      for (const item of result.created) {
        console.log(`  Stage ${item.stageNumber.toString().padStart(2, "0")}: ${item.stageName}`);
        console.log(`    ${item.issueUrl}`);
      }
    }
    if (result.reopened.length > 0) {
      console.log(`
Reopened ${result.reopened.length} stage issue(s):`);
      for (const item of result.reopened) {
        console.log(`  Stage ${item.stageNumber.toString().padStart(2, "0")}: ${item.stageName}`);
        console.log(`    ${item.issueUrl}`);
      }
    }
    if (result.skipped.length > 0) {
      console.log(`
Skipped ${result.skipped.length} stage(s):`);
      for (const item of result.skipped) {
        console.log(`  Stage ${item.stageNumber.toString().padStart(2, "0")}: ${item.stageName} - ${item.reason}`);
      }
    }
    if (result.failed.length > 0) {
      console.log(`
Failed ${result.failed.length} stage(s):`);
      for (const item of result.failed) {
        console.log(`  Stage ${item.stageNumber.toString().padStart(2, "0")}: ${item.stageName} - ${item.error}`);
      }
    }
    if (result.created.length === 0 && result.reopened.length === 0 && result.skipped.length === 0 && result.failed.length === 0) {
      console.log("No stages to process");
    }
  }
}
function parseSimpleArgs(argv, commandIndex) {
  const args = argv.slice(commandIndex + 1);
  const parsed = {};
  for (let i = 0;i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];
    switch (arg) {
      case "--repo-root":
      case "-r":
        if (!next) {
          console.error("Error: --repo-root requires a value");
          return null;
        }
        parsed.repoRoot = next;
        i++;
        break;
      case "--help":
      case "-h":
        return null;
    }
  }
  return parsed;
}
async function enableCommand(argv) {
  const args = argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    printEnableHelp();
    process.exit(0);
  }
  const cliArgs = parseSimpleArgs(argv, 2);
  let repoRoot;
  try {
    repoRoot = cliArgs?.repoRoot ?? getRepoRoot();
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  console.log("Enabling GitHub integration...");
  try {
    await enableGitHub(repoRoot);
    const config = await loadGitHubConfig(repoRoot);
    console.log(`GitHub integration enabled for ${config.owner}/${config.repo}`);
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }
}
async function disableCommand(argv) {
  const args = argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    printDisableHelp();
    process.exit(0);
  }
  const cliArgs = parseSimpleArgs(argv, 2);
  let repoRoot;
  try {
    repoRoot = cliArgs?.repoRoot ?? getRepoRoot();
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  console.log("Disabling GitHub integration...");
  try {
    await disableGitHub(repoRoot);
    console.log("GitHub integration disabled");
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }
}
async function statusCommand(argv) {
  const args = argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    printStatusHelp();
    process.exit(0);
  }
  const cliArgs = parseSimpleArgs(argv, 2);
  let repoRoot;
  try {
    repoRoot = cliArgs?.repoRoot ?? getRepoRoot();
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  const config = await loadGitHubConfig(repoRoot);
  console.log("GitHub Integration Status");
  console.log("=".repeat(40));
  console.log();
  console.log(`Enabled:       ${config.enabled ? "Yes" : "No"}`);
  if (config.owner && config.repo) {
    console.log(`Repository:    ${config.owner}/${config.repo}`);
  } else {
    console.log("Repository:    Not configured");
  }
  console.log(`Branch Prefix: ${config.branch_prefix}`);
  console.log();
  console.log("Authentication:");
  const token = getGitHubAuth();
  if (token) {
    const isValid = await validateAuth(token);
    const source = process.env.GITHUB_TOKEN ? "GITHUB_TOKEN" : process.env.GH_TOKEN ? "GH_TOKEN" : "gh CLI";
    console.log(`  Source:      ${source}`);
    console.log(`  Valid:       ${isValid ? "Yes" : "No"}`);
  } else {
    console.log("  Status:      Not authenticated");
    console.log("  Hint:        Set GITHUB_TOKEN, GH_TOKEN, or run 'gh auth login'");
  }
  console.log();
  console.log("Label Configuration:");
  console.log(`  Workstream:  ${config.label_config.workstream.prefix} (color: #${config.label_config.workstream.color})`);
  console.log(`  Stage:       ${config.label_config.stage.prefix} (color: #${config.label_config.stage.color})`);
  console.log(`  Batch:       ${config.label_config.batch.prefix} (color: #${config.label_config.batch.color})`);
  console.log(`  Thread:      ${config.label_config.thread.prefix} (color: #${config.label_config.thread.color})`);
}
function parseSyncArgs(argv) {
  const args = argv.slice(3);
  const parsed = { json: false };
  for (let i = 0;i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];
    switch (arg) {
      case "--repo-root":
      case "-r":
        if (!next) {
          console.error("Error: --repo-root requires a value");
          return null;
        }
        parsed.repoRoot = next;
        i++;
        break;
      case "--stream":
      case "-s":
        if (!next) {
          console.error("Error: --stream requires a value");
          return null;
        }
        parsed.streamId = next;
        i++;
        break;
      case "--json":
      case "-j":
        parsed.json = true;
        break;
      case "--help":
      case "-h":
        printSyncHelp();
        process.exit(0);
    }
  }
  return parsed;
}
async function syncCommand(argv) {
  const cliArgs = parseSyncArgs(argv);
  if (!cliArgs) {
    console.error(`
Run 'work github sync --help' for usage information.`);
    process.exit(1);
  }
  let repoRoot;
  try {
    repoRoot = cliArgs.repoRoot ?? getRepoRoot();
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  const enabled = await isGitHubEnabled(repoRoot);
  if (!enabled) {
    console.error("Error: GitHub integration is not enabled");
    console.error("Run 'work github enable' to enable it");
    process.exit(1);
  }
  try {
    await ensureGitHubAuth();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
  let index;
  try {
    index = loadIndex(repoRoot);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  const resolvedStreamId = resolveStreamId(index, cliArgs.streamId);
  if (!resolvedStreamId) {
    console.error("Error: No workstream specified and no current workstream set.");
    console.error("Use --stream to specify a workstream, or run 'work current --set <stream>'");
    process.exit(1);
  }
  const stream = getStream(index, resolvedStreamId);
  if (!cliArgs.json) {
    console.log(`Syncing stage issue states for workstream: ${stream.id}`);
    console.log("");
  }
  let result;
  try {
    result = await syncStageIssues(repoRoot, stream.id);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
  if (cliArgs.json) {
    console.log(JSON.stringify({
      streamId: stream.id,
      streamName: stream.name,
      ...result
    }, null, 2));
  } else {
    if (result.closed.length > 0) {
      console.log(`Closed ${result.closed.length} stage issue(s):`);
      for (const item of result.closed) {
        console.log(`  Stage ${item.stageNumber}: ${item.stageName}`);
        console.log(`    #${item.issueNumber}: ${item.issueUrl}`);
      }
      console.log("");
    }
    if (result.unchanged.length > 0) {
      console.log(`Unchanged ${result.unchanged.length} stage issue(s):`);
      for (const item of result.unchanged) {
        console.log(`  Stage ${item.stageNumber}: ${item.stageName} - ${item.reason}`);
      }
      console.log("");
    }
    if (result.errors.length > 0) {
      console.log(`Errors ${result.errors.length}:`);
      for (const item of result.errors) {
        console.log(`  Stage ${item.stageNumber}: ${item.stageName} - ${item.error}`);
      }
      console.log("");
    }
    const closedCount = result.closed.length;
    const unchangedCount = result.unchanged.length;
    const errorCount = result.errors.length;
    if (closedCount === 0 && unchangedCount === 0 && errorCount === 0) {
      console.log("No stage issues to sync (no stages have associated GitHub issues)");
    } else {
      console.log(`Summary: Closed ${closedCount} stage issues, ${unchangedCount} unchanged`);
      if (errorCount > 0) {
        console.log(`  ${errorCount} error(s) occurred`);
      }
    }
  }
}
function main(argv = process.argv) {
  const args = argv.slice(2);
  if (args.length === 0) {
    printHelp();
    process.exit(0);
  }
  const firstArg = args[0];
  if (firstArg === "--help" || firstArg === "-h") {
    printHelp();
    process.exit(0);
  }
  if (!SUBCOMMANDS.includes(firstArg)) {
    console.error(`Error: Unknown subcommand "${firstArg}"`);
    console.error(`
Available subcommands: ` + SUBCOMMANDS.join(", "));
    console.error(`
Run 'work github --help' for usage information.`);
    process.exit(1);
  }
  const subcommand = firstArg;
  switch (subcommand) {
    case "enable":
      enableCommand(argv);
      break;
    case "disable":
      disableCommand(argv);
      break;
    case "status":
      statusCommand(argv);
      break;
    case "create-branch":
      createBranchCommand(argv);
      break;
    case "create-issues":
      createIssuesCommand(argv);
      break;
    case "sync":
      syncCommand(argv);
      break;
  }
}
if (__require.main == __require.module) {
  main();
}
async function createStageIssuesForWorkstream(repoRoot, streamId, streamName) {
  const tasksFile = readTasksFile(repoRoot, streamId);
  if (!tasksFile || tasksFile.tasks.length === 0) {
    return { created: [], skipped: [], reopened: [], failed: [] };
  }
  const stages = groupTasksByStage(tasksFile.tasks);
  return createIssuesForStages(repoRoot, streamId, streamName, stages);
}
export {
  main,
  createStageIssuesForWorkstream
};
