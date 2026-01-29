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
var __esm = (fn, res) => () => (fn && (res = fn(fn = 0)), res);
var __require = /* @__PURE__ */ createRequire(import.meta.url);

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
var init_repo = () => {};

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

// src/lib/index.ts
import { existsSync as existsSync2, readFileSync, writeFileSync, renameSync, rmSync } from "fs";
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
function getResolvedStream(index, streamIdOrName) {
  const resolvedId = resolveStreamId(index, streamIdOrName);
  if (!resolvedId) {
    throw new Error("No workstream specified and no current workstream set. Use --stream <id> or 'work current --set <id>'");
  }
  return getStream(index, resolvedId);
}
var lockfile;
var init_lib = __esm(() => {
  init_repo();
  lockfile = __toESM(require_proper_lockfile(), 1);
});

// src/lib/threads.ts
import { existsSync as existsSync3, readFileSync as readFileSync2 } from "fs";
import { join as join2 } from "path";
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
var lockfile2, THREADS_FILE_VERSION = "1.0.0";
var init_threads = __esm(() => {
  init_lib();
  init_repo();
  lockfile2 = __toESM(require_proper_lockfile(), 1);
});

// src/lib/tasks.ts
import { existsSync as existsSync4, readFileSync as readFileSync3, copyFileSync } from "fs";
import { join as join3 } from "path";
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
function getTasks(repoRoot, streamId, status) {
  const tasksFile = readTasksFile(repoRoot, streamId);
  if (!tasksFile)
    return [];
  if (status) {
    return tasksFile.tasks.filter((t) => t.status === status);
  }
  return tasksFile.tasks;
}
var init_tasks = __esm(() => {
  init_lib();
  init_repo();
  init_threads();
});

// ../../node_modules/.bun/marked@17.0.1/node_modules/marked/lib/marked.esm.js
function L() {
  return { async: false, breaks: false, extensions: null, gfm: true, hooks: null, pedantic: false, renderer: null, silent: false, tokenizer: null, walkTokens: null };
}
function Z(u) {
  T = u;
}
function k(u, e = "") {
  let t = typeof u == "string" ? u : u.source, n = { replace: (r, i) => {
    let s = typeof i == "string" ? i : i.source;
    return s = s.replace(m.caret, "$1"), t = t.replace(r, s), n;
  }, getRegex: () => new RegExp(t, e) };
  return n;
}
function w(u, e) {
  if (e) {
    if (m.escapeTest.test(u))
      return u.replace(m.escapeReplace, ke);
  } else if (m.escapeTestNoEncode.test(u))
    return u.replace(m.escapeReplaceNoEncode, ke);
  return u;
}
function X(u) {
  try {
    u = encodeURI(u).replace(m.percentDecode, "%");
  } catch {
    return null;
  }
  return u;
}
function J(u, e) {
  let t = u.replace(m.findPipe, (i, s, a) => {
    let o = false, l = s;
    for (;--l >= 0 && a[l] === "\\"; )
      o = !o;
    return o ? "|" : " |";
  }), n = t.split(m.splitPipe), r = 0;
  if (n[0].trim() || n.shift(), n.length > 0 && !n.at(-1)?.trim() && n.pop(), e)
    if (n.length > e)
      n.splice(e);
    else
      for (;n.length < e; )
        n.push("");
  for (;r < n.length; r++)
    n[r] = n[r].trim().replace(m.slashPipe, "|");
  return n;
}
function z(u, e, t) {
  let n = u.length;
  if (n === 0)
    return "";
  let r = 0;
  for (;r < n; ) {
    let i = u.charAt(n - r - 1);
    if (i === e && !t)
      r++;
    else if (i !== e && t)
      r++;
    else
      break;
  }
  return u.slice(0, n - r);
}
function de(u, e) {
  if (u.indexOf(e[1]) === -1)
    return -1;
  let t = 0;
  for (let n = 0;n < u.length; n++)
    if (u[n] === "\\")
      n++;
    else if (u[n] === e[0])
      t++;
    else if (u[n] === e[1] && (t--, t < 0))
      return n;
  return t > 0 ? -2 : -1;
}
function ge(u, e, t, n, r) {
  let i = e.href, s = e.title || null, a = u[1].replace(r.other.outputLinkReplace, "$1");
  n.state.inLink = true;
  let o = { type: u[0].charAt(0) === "!" ? "image" : "link", raw: t, href: i, title: s, text: a, tokens: n.inlineTokens(a) };
  return n.state.inLink = false, o;
}
function Je(u, e, t) {
  let n = u.match(t.other.indentCodeCompensation);
  if (n === null)
    return e;
  let r = n[1];
  return e.split(`
`).map((i) => {
    let s = i.match(t.other.beginningSpace);
    if (s === null)
      return i;
    let [a] = s;
    return a.length >= r.length ? i.slice(r.length) : i;
  }).join(`
`);
}
function d(u3, e) {
  return _.parse(u3, e);
}
var T, C, me, m, xe, be, Re, I, Te, N, re, se, Oe, Q, we, F, ye, Pe, v = "address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul", j, Se, ie, $e, U, te, _e, Le, Me, ze, oe, Ae, D, K, ae, Ce, le, Ie, Ee, Be, ue, qe, ve, pe = "^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)punctSpace(\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|notPunctSpace(\\*+)(?=notPunctSpace)", De, He, Ze, Ge, Ne, Qe, Fe, q, je, ce, he, Ue, ne, W, Ke, G, We, E, M, Xe, ke = (u) => Xe[u], y = class {
  options;
  rules;
  lexer;
  constructor(e) {
    this.options = e || T;
  }
  space(e) {
    let t = this.rules.block.newline.exec(e);
    if (t && t[0].length > 0)
      return { type: "space", raw: t[0] };
  }
  code(e) {
    let t = this.rules.block.code.exec(e);
    if (t) {
      let n = t[0].replace(this.rules.other.codeRemoveIndent, "");
      return { type: "code", raw: t[0], codeBlockStyle: "indented", text: this.options.pedantic ? n : z(n, `
`) };
    }
  }
  fences(e) {
    let t = this.rules.block.fences.exec(e);
    if (t) {
      let n = t[0], r = Je(n, t[3] || "", this.rules);
      return { type: "code", raw: n, lang: t[2] ? t[2].trim().replace(this.rules.inline.anyPunctuation, "$1") : t[2], text: r };
    }
  }
  heading(e) {
    let t = this.rules.block.heading.exec(e);
    if (t) {
      let n = t[2].trim();
      if (this.rules.other.endingHash.test(n)) {
        let r = z(n, "#");
        (this.options.pedantic || !r || this.rules.other.endingSpaceChar.test(r)) && (n = r.trim());
      }
      return { type: "heading", raw: t[0], depth: t[1].length, text: n, tokens: this.lexer.inline(n) };
    }
  }
  hr(e) {
    let t = this.rules.block.hr.exec(e);
    if (t)
      return { type: "hr", raw: z(t[0], `
`) };
  }
  blockquote(e) {
    let t = this.rules.block.blockquote.exec(e);
    if (t) {
      let n = z(t[0], `
`).split(`
`), r = "", i = "", s = [];
      for (;n.length > 0; ) {
        let a = false, o = [], l;
        for (l = 0;l < n.length; l++)
          if (this.rules.other.blockquoteStart.test(n[l]))
            o.push(n[l]), a = true;
          else if (!a)
            o.push(n[l]);
          else
            break;
        n = n.slice(l);
        let p = o.join(`
`), c = p.replace(this.rules.other.blockquoteSetextReplace, `
    $1`).replace(this.rules.other.blockquoteSetextReplace2, "");
        r = r ? `${r}
${p}` : p, i = i ? `${i}
${c}` : c;
        let g = this.lexer.state.top;
        if (this.lexer.state.top = true, this.lexer.blockTokens(c, s, true), this.lexer.state.top = g, n.length === 0)
          break;
        let h = s.at(-1);
        if (h?.type === "code")
          break;
        if (h?.type === "blockquote") {
          let R = h, f = R.raw + `
` + n.join(`
`), O = this.blockquote(f);
          s[s.length - 1] = O, r = r.substring(0, r.length - R.raw.length) + O.raw, i = i.substring(0, i.length - R.text.length) + O.text;
          break;
        } else if (h?.type === "list") {
          let R = h, f = R.raw + `
` + n.join(`
`), O = this.list(f);
          s[s.length - 1] = O, r = r.substring(0, r.length - h.raw.length) + O.raw, i = i.substring(0, i.length - R.raw.length) + O.raw, n = f.substring(s.at(-1).raw.length).split(`
`);
          continue;
        }
      }
      return { type: "blockquote", raw: r, tokens: s, text: i };
    }
  }
  list(e) {
    let t = this.rules.block.list.exec(e);
    if (t) {
      let n = t[1].trim(), r = n.length > 1, i = { type: "list", raw: "", ordered: r, start: r ? +n.slice(0, -1) : "", loose: false, items: [] };
      n = r ? `\\d{1,9}\\${n.slice(-1)}` : `\\${n}`, this.options.pedantic && (n = r ? n : "[*+-]");
      let s = this.rules.other.listItemRegex(n), a = false;
      for (;e; ) {
        let l = false, p = "", c = "";
        if (!(t = s.exec(e)) || this.rules.block.hr.test(e))
          break;
        p = t[0], e = e.substring(p.length);
        let g = t[2].split(`
`, 1)[0].replace(this.rules.other.listReplaceTabs, (O) => " ".repeat(3 * O.length)), h = e.split(`
`, 1)[0], R = !g.trim(), f = 0;
        if (this.options.pedantic ? (f = 2, c = g.trimStart()) : R ? f = t[1].length + 1 : (f = t[2].search(this.rules.other.nonSpaceChar), f = f > 4 ? 1 : f, c = g.slice(f), f += t[1].length), R && this.rules.other.blankLine.test(h) && (p += h + `
`, e = e.substring(h.length + 1), l = true), !l) {
          let O = this.rules.other.nextBulletRegex(f), V = this.rules.other.hrRegex(f), Y = this.rules.other.fencesBeginRegex(f), ee = this.rules.other.headingBeginRegex(f), fe = this.rules.other.htmlBeginRegex(f);
          for (;e; ) {
            let H = e.split(`
`, 1)[0], A;
            if (h = H, this.options.pedantic ? (h = h.replace(this.rules.other.listReplaceNesting, "  "), A = h) : A = h.replace(this.rules.other.tabCharGlobal, "    "), Y.test(h) || ee.test(h) || fe.test(h) || O.test(h) || V.test(h))
              break;
            if (A.search(this.rules.other.nonSpaceChar) >= f || !h.trim())
              c += `
` + A.slice(f);
            else {
              if (R || g.replace(this.rules.other.tabCharGlobal, "    ").search(this.rules.other.nonSpaceChar) >= 4 || Y.test(g) || ee.test(g) || V.test(g))
                break;
              c += `
` + h;
            }
            !R && !h.trim() && (R = true), p += H + `
`, e = e.substring(H.length + 1), g = A.slice(f);
          }
        }
        i.loose || (a ? i.loose = true : this.rules.other.doubleBlankLine.test(p) && (a = true)), i.items.push({ type: "list_item", raw: p, task: !!this.options.gfm && this.rules.other.listIsTask.test(c), loose: false, text: c, tokens: [] }), i.raw += p;
      }
      let o = i.items.at(-1);
      if (o)
        o.raw = o.raw.trimEnd(), o.text = o.text.trimEnd();
      else
        return;
      i.raw = i.raw.trimEnd();
      for (let l of i.items) {
        if (this.lexer.state.top = false, l.tokens = this.lexer.blockTokens(l.text, []), l.task) {
          if (l.text = l.text.replace(this.rules.other.listReplaceTask, ""), l.tokens[0]?.type === "text" || l.tokens[0]?.type === "paragraph") {
            l.tokens[0].raw = l.tokens[0].raw.replace(this.rules.other.listReplaceTask, ""), l.tokens[0].text = l.tokens[0].text.replace(this.rules.other.listReplaceTask, "");
            for (let c = this.lexer.inlineQueue.length - 1;c >= 0; c--)
              if (this.rules.other.listIsTask.test(this.lexer.inlineQueue[c].src)) {
                this.lexer.inlineQueue[c].src = this.lexer.inlineQueue[c].src.replace(this.rules.other.listReplaceTask, "");
                break;
              }
          }
          let p = this.rules.other.listTaskCheckbox.exec(l.raw);
          if (p) {
            let c = { type: "checkbox", raw: p[0] + " ", checked: p[0] !== "[ ]" };
            l.checked = c.checked, i.loose ? l.tokens[0] && ["paragraph", "text"].includes(l.tokens[0].type) && "tokens" in l.tokens[0] && l.tokens[0].tokens ? (l.tokens[0].raw = c.raw + l.tokens[0].raw, l.tokens[0].text = c.raw + l.tokens[0].text, l.tokens[0].tokens.unshift(c)) : l.tokens.unshift({ type: "paragraph", raw: c.raw, text: c.raw, tokens: [c] }) : l.tokens.unshift(c);
          }
        }
        if (!i.loose) {
          let p = l.tokens.filter((g) => g.type === "space"), c = p.length > 0 && p.some((g) => this.rules.other.anyLine.test(g.raw));
          i.loose = c;
        }
      }
      if (i.loose)
        for (let l of i.items) {
          l.loose = true;
          for (let p of l.tokens)
            p.type === "text" && (p.type = "paragraph");
        }
      return i;
    }
  }
  html(e) {
    let t = this.rules.block.html.exec(e);
    if (t)
      return { type: "html", block: true, raw: t[0], pre: t[1] === "pre" || t[1] === "script" || t[1] === "style", text: t[0] };
  }
  def(e) {
    let t = this.rules.block.def.exec(e);
    if (t) {
      let n = t[1].toLowerCase().replace(this.rules.other.multipleSpaceGlobal, " "), r = t[2] ? t[2].replace(this.rules.other.hrefBrackets, "$1").replace(this.rules.inline.anyPunctuation, "$1") : "", i = t[3] ? t[3].substring(1, t[3].length - 1).replace(this.rules.inline.anyPunctuation, "$1") : t[3];
      return { type: "def", tag: n, raw: t[0], href: r, title: i };
    }
  }
  table(e) {
    let t = this.rules.block.table.exec(e);
    if (!t || !this.rules.other.tableDelimiter.test(t[2]))
      return;
    let n = J(t[1]), r = t[2].replace(this.rules.other.tableAlignChars, "").split("|"), i = t[3]?.trim() ? t[3].replace(this.rules.other.tableRowBlankLine, "").split(`
`) : [], s = { type: "table", raw: t[0], header: [], align: [], rows: [] };
    if (n.length === r.length) {
      for (let a of r)
        this.rules.other.tableAlignRight.test(a) ? s.align.push("right") : this.rules.other.tableAlignCenter.test(a) ? s.align.push("center") : this.rules.other.tableAlignLeft.test(a) ? s.align.push("left") : s.align.push(null);
      for (let a = 0;a < n.length; a++)
        s.header.push({ text: n[a], tokens: this.lexer.inline(n[a]), header: true, align: s.align[a] });
      for (let a of i)
        s.rows.push(J(a, s.header.length).map((o, l) => ({ text: o, tokens: this.lexer.inline(o), header: false, align: s.align[l] })));
      return s;
    }
  }
  lheading(e) {
    let t = this.rules.block.lheading.exec(e);
    if (t)
      return { type: "heading", raw: t[0], depth: t[2].charAt(0) === "=" ? 1 : 2, text: t[1], tokens: this.lexer.inline(t[1]) };
  }
  paragraph(e) {
    let t = this.rules.block.paragraph.exec(e);
    if (t) {
      let n = t[1].charAt(t[1].length - 1) === `
` ? t[1].slice(0, -1) : t[1];
      return { type: "paragraph", raw: t[0], text: n, tokens: this.lexer.inline(n) };
    }
  }
  text(e) {
    let t = this.rules.block.text.exec(e);
    if (t)
      return { type: "text", raw: t[0], text: t[0], tokens: this.lexer.inline(t[0]) };
  }
  escape(e) {
    let t = this.rules.inline.escape.exec(e);
    if (t)
      return { type: "escape", raw: t[0], text: t[1] };
  }
  tag(e) {
    let t = this.rules.inline.tag.exec(e);
    if (t)
      return !this.lexer.state.inLink && this.rules.other.startATag.test(t[0]) ? this.lexer.state.inLink = true : this.lexer.state.inLink && this.rules.other.endATag.test(t[0]) && (this.lexer.state.inLink = false), !this.lexer.state.inRawBlock && this.rules.other.startPreScriptTag.test(t[0]) ? this.lexer.state.inRawBlock = true : this.lexer.state.inRawBlock && this.rules.other.endPreScriptTag.test(t[0]) && (this.lexer.state.inRawBlock = false), { type: "html", raw: t[0], inLink: this.lexer.state.inLink, inRawBlock: this.lexer.state.inRawBlock, block: false, text: t[0] };
  }
  link(e) {
    let t = this.rules.inline.link.exec(e);
    if (t) {
      let n = t[2].trim();
      if (!this.options.pedantic && this.rules.other.startAngleBracket.test(n)) {
        if (!this.rules.other.endAngleBracket.test(n))
          return;
        let s = z(n.slice(0, -1), "\\");
        if ((n.length - s.length) % 2 === 0)
          return;
      } else {
        let s = de(t[2], "()");
        if (s === -2)
          return;
        if (s > -1) {
          let o = (t[0].indexOf("!") === 0 ? 5 : 4) + t[1].length + s;
          t[2] = t[2].substring(0, s), t[0] = t[0].substring(0, o).trim(), t[3] = "";
        }
      }
      let r = t[2], i = "";
      if (this.options.pedantic) {
        let s = this.rules.other.pedanticHrefTitle.exec(r);
        s && (r = s[1], i = s[3]);
      } else
        i = t[3] ? t[3].slice(1, -1) : "";
      return r = r.trim(), this.rules.other.startAngleBracket.test(r) && (this.options.pedantic && !this.rules.other.endAngleBracket.test(n) ? r = r.slice(1) : r = r.slice(1, -1)), ge(t, { href: r && r.replace(this.rules.inline.anyPunctuation, "$1"), title: i && i.replace(this.rules.inline.anyPunctuation, "$1") }, t[0], this.lexer, this.rules);
    }
  }
  reflink(e, t) {
    let n;
    if ((n = this.rules.inline.reflink.exec(e)) || (n = this.rules.inline.nolink.exec(e))) {
      let r = (n[2] || n[1]).replace(this.rules.other.multipleSpaceGlobal, " "), i = t[r.toLowerCase()];
      if (!i) {
        let s = n[0].charAt(0);
        return { type: "text", raw: s, text: s };
      }
      return ge(n, i, n[0], this.lexer, this.rules);
    }
  }
  emStrong(e, t, n = "") {
    let r = this.rules.inline.emStrongLDelim.exec(e);
    if (!r || r[3] && n.match(this.rules.other.unicodeAlphaNumeric))
      return;
    if (!(r[1] || r[2] || "") || !n || this.rules.inline.punctuation.exec(n)) {
      let s = [...r[0]].length - 1, a, o, l = s, p = 0, c = r[0][0] === "*" ? this.rules.inline.emStrongRDelimAst : this.rules.inline.emStrongRDelimUnd;
      for (c.lastIndex = 0, t = t.slice(-1 * e.length + s);(r = c.exec(t)) != null; ) {
        if (a = r[1] || r[2] || r[3] || r[4] || r[5] || r[6], !a)
          continue;
        if (o = [...a].length, r[3] || r[4]) {
          l += o;
          continue;
        } else if ((r[5] || r[6]) && s % 3 && !((s + o) % 3)) {
          p += o;
          continue;
        }
        if (l -= o, l > 0)
          continue;
        o = Math.min(o, o + l + p);
        let g = [...r[0]][0].length, h = e.slice(0, s + r.index + g + o);
        if (Math.min(s, o) % 2) {
          let f = h.slice(1, -1);
          return { type: "em", raw: h, text: f, tokens: this.lexer.inlineTokens(f) };
        }
        let R = h.slice(2, -2);
        return { type: "strong", raw: h, text: R, tokens: this.lexer.inlineTokens(R) };
      }
    }
  }
  codespan(e) {
    let t = this.rules.inline.code.exec(e);
    if (t) {
      let n = t[2].replace(this.rules.other.newLineCharGlobal, " "), r = this.rules.other.nonSpaceChar.test(n), i = this.rules.other.startingSpaceChar.test(n) && this.rules.other.endingSpaceChar.test(n);
      return r && i && (n = n.substring(1, n.length - 1)), { type: "codespan", raw: t[0], text: n };
    }
  }
  br(e) {
    let t = this.rules.inline.br.exec(e);
    if (t)
      return { type: "br", raw: t[0] };
  }
  del(e) {
    let t = this.rules.inline.del.exec(e);
    if (t)
      return { type: "del", raw: t[0], text: t[2], tokens: this.lexer.inlineTokens(t[2]) };
  }
  autolink(e) {
    let t = this.rules.inline.autolink.exec(e);
    if (t) {
      let n, r;
      return t[2] === "@" ? (n = t[1], r = "mailto:" + n) : (n = t[1], r = n), { type: "link", raw: t[0], text: n, href: r, tokens: [{ type: "text", raw: n, text: n }] };
    }
  }
  url(e) {
    let t;
    if (t = this.rules.inline.url.exec(e)) {
      let n, r;
      if (t[2] === "@")
        n = t[0], r = "mailto:" + n;
      else {
        let i;
        do
          i = t[0], t[0] = this.rules.inline._backpedal.exec(t[0])?.[0] ?? "";
        while (i !== t[0]);
        n = t[0], t[1] === "www." ? r = "http://" + t[0] : r = t[0];
      }
      return { type: "link", raw: t[0], text: n, href: r, tokens: [{ type: "text", raw: n, text: n }] };
    }
  }
  inlineText(e) {
    let t = this.rules.inline.text.exec(e);
    if (t) {
      let n = this.lexer.state.inRawBlock;
      return { type: "text", raw: t[0], text: t[0], escaped: n };
    }
  }
}, x = class u {
  tokens;
  options;
  state;
  inlineQueue;
  tokenizer;
  constructor(e) {
    this.tokens = [], this.tokens.links = Object.create(null), this.options = e || T, this.options.tokenizer = this.options.tokenizer || new y, this.tokenizer = this.options.tokenizer, this.tokenizer.options = this.options, this.tokenizer.lexer = this, this.inlineQueue = [], this.state = { inLink: false, inRawBlock: false, top: true };
    let t = { other: m, block: E.normal, inline: M.normal };
    this.options.pedantic ? (t.block = E.pedantic, t.inline = M.pedantic) : this.options.gfm && (t.block = E.gfm, this.options.breaks ? t.inline = M.breaks : t.inline = M.gfm), this.tokenizer.rules = t;
  }
  static get rules() {
    return { block: E, inline: M };
  }
  static lex(e, t) {
    return new u(t).lex(e);
  }
  static lexInline(e, t) {
    return new u(t).inlineTokens(e);
  }
  lex(e) {
    e = e.replace(m.carriageReturn, `
`), this.blockTokens(e, this.tokens);
    for (let t = 0;t < this.inlineQueue.length; t++) {
      let n = this.inlineQueue[t];
      this.inlineTokens(n.src, n.tokens);
    }
    return this.inlineQueue = [], this.tokens;
  }
  blockTokens(e, t = [], n = false) {
    for (this.options.pedantic && (e = e.replace(m.tabCharGlobal, "    ").replace(m.spaceLine, ""));e; ) {
      let r;
      if (this.options.extensions?.block?.some((s) => (r = s.call({ lexer: this }, e, t)) ? (e = e.substring(r.raw.length), t.push(r), true) : false))
        continue;
      if (r = this.tokenizer.space(e)) {
        e = e.substring(r.raw.length);
        let s = t.at(-1);
        r.raw.length === 1 && s !== undefined ? s.raw += `
` : t.push(r);
        continue;
      }
      if (r = this.tokenizer.code(e)) {
        e = e.substring(r.raw.length);
        let s = t.at(-1);
        s?.type === "paragraph" || s?.type === "text" ? (s.raw += (s.raw.endsWith(`
`) ? "" : `
`) + r.raw, s.text += `
` + r.text, this.inlineQueue.at(-1).src = s.text) : t.push(r);
        continue;
      }
      if (r = this.tokenizer.fences(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.heading(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.hr(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.blockquote(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.list(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.html(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.def(e)) {
        e = e.substring(r.raw.length);
        let s = t.at(-1);
        s?.type === "paragraph" || s?.type === "text" ? (s.raw += (s.raw.endsWith(`
`) ? "" : `
`) + r.raw, s.text += `
` + r.raw, this.inlineQueue.at(-1).src = s.text) : this.tokens.links[r.tag] || (this.tokens.links[r.tag] = { href: r.href, title: r.title }, t.push(r));
        continue;
      }
      if (r = this.tokenizer.table(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.lheading(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      let i = e;
      if (this.options.extensions?.startBlock) {
        let s = 1 / 0, a = e.slice(1), o;
        this.options.extensions.startBlock.forEach((l) => {
          o = l.call({ lexer: this }, a), typeof o == "number" && o >= 0 && (s = Math.min(s, o));
        }), s < 1 / 0 && s >= 0 && (i = e.substring(0, s + 1));
      }
      if (this.state.top && (r = this.tokenizer.paragraph(i))) {
        let s = t.at(-1);
        n && s?.type === "paragraph" ? (s.raw += (s.raw.endsWith(`
`) ? "" : `
`) + r.raw, s.text += `
` + r.text, this.inlineQueue.pop(), this.inlineQueue.at(-1).src = s.text) : t.push(r), n = i.length !== e.length, e = e.substring(r.raw.length);
        continue;
      }
      if (r = this.tokenizer.text(e)) {
        e = e.substring(r.raw.length);
        let s = t.at(-1);
        s?.type === "text" ? (s.raw += (s.raw.endsWith(`
`) ? "" : `
`) + r.raw, s.text += `
` + r.text, this.inlineQueue.pop(), this.inlineQueue.at(-1).src = s.text) : t.push(r);
        continue;
      }
      if (e) {
        let s = "Infinite loop on byte: " + e.charCodeAt(0);
        if (this.options.silent) {
          console.error(s);
          break;
        } else
          throw new Error(s);
      }
    }
    return this.state.top = true, t;
  }
  inline(e, t = []) {
    return this.inlineQueue.push({ src: e, tokens: t }), t;
  }
  inlineTokens(e, t = []) {
    let n = e, r = null;
    if (this.tokens.links) {
      let o = Object.keys(this.tokens.links);
      if (o.length > 0)
        for (;(r = this.tokenizer.rules.inline.reflinkSearch.exec(n)) != null; )
          o.includes(r[0].slice(r[0].lastIndexOf("[") + 1, -1)) && (n = n.slice(0, r.index) + "[" + "a".repeat(r[0].length - 2) + "]" + n.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex));
    }
    for (;(r = this.tokenizer.rules.inline.anyPunctuation.exec(n)) != null; )
      n = n.slice(0, r.index) + "++" + n.slice(this.tokenizer.rules.inline.anyPunctuation.lastIndex);
    let i;
    for (;(r = this.tokenizer.rules.inline.blockSkip.exec(n)) != null; )
      i = r[2] ? r[2].length : 0, n = n.slice(0, r.index + i) + "[" + "a".repeat(r[0].length - i - 2) + "]" + n.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);
    n = this.options.hooks?.emStrongMask?.call({ lexer: this }, n) ?? n;
    let s = false, a = "";
    for (;e; ) {
      s || (a = ""), s = false;
      let o;
      if (this.options.extensions?.inline?.some((p) => (o = p.call({ lexer: this }, e, t)) ? (e = e.substring(o.raw.length), t.push(o), true) : false))
        continue;
      if (o = this.tokenizer.escape(e)) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      if (o = this.tokenizer.tag(e)) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      if (o = this.tokenizer.link(e)) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      if (o = this.tokenizer.reflink(e, this.tokens.links)) {
        e = e.substring(o.raw.length);
        let p = t.at(-1);
        o.type === "text" && p?.type === "text" ? (p.raw += o.raw, p.text += o.text) : t.push(o);
        continue;
      }
      if (o = this.tokenizer.emStrong(e, n, a)) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      if (o = this.tokenizer.codespan(e)) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      if (o = this.tokenizer.br(e)) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      if (o = this.tokenizer.del(e)) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      if (o = this.tokenizer.autolink(e)) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      if (!this.state.inLink && (o = this.tokenizer.url(e))) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      let l = e;
      if (this.options.extensions?.startInline) {
        let p = 1 / 0, c = e.slice(1), g;
        this.options.extensions.startInline.forEach((h) => {
          g = h.call({ lexer: this }, c), typeof g == "number" && g >= 0 && (p = Math.min(p, g));
        }), p < 1 / 0 && p >= 0 && (l = e.substring(0, p + 1));
      }
      if (o = this.tokenizer.inlineText(l)) {
        e = e.substring(o.raw.length), o.raw.slice(-1) !== "_" && (a = o.raw.slice(-1)), s = true;
        let p = t.at(-1);
        p?.type === "text" ? (p.raw += o.raw, p.text += o.text) : t.push(o);
        continue;
      }
      if (e) {
        let p = "Infinite loop on byte: " + e.charCodeAt(0);
        if (this.options.silent) {
          console.error(p);
          break;
        } else
          throw new Error(p);
      }
    }
    return t;
  }
}, P = class {
  options;
  parser;
  constructor(e) {
    this.options = e || T;
  }
  space(e) {
    return "";
  }
  code({ text: e, lang: t, escaped: n }) {
    let r = (t || "").match(m.notSpaceStart)?.[0], i = e.replace(m.endingNewline, "") + `
`;
    return r ? '<pre><code class="language-' + w(r) + '">' + (n ? i : w(i, true)) + `</code></pre>
` : "<pre><code>" + (n ? i : w(i, true)) + `</code></pre>
`;
  }
  blockquote({ tokens: e }) {
    return `<blockquote>
${this.parser.parse(e)}</blockquote>
`;
  }
  html({ text: e }) {
    return e;
  }
  def(e) {
    return "";
  }
  heading({ tokens: e, depth: t }) {
    return `<h${t}>${this.parser.parseInline(e)}</h${t}>
`;
  }
  hr(e) {
    return `<hr>
`;
  }
  list(e) {
    let { ordered: t, start: n } = e, r = "";
    for (let a = 0;a < e.items.length; a++) {
      let o = e.items[a];
      r += this.listitem(o);
    }
    let i = t ? "ol" : "ul", s = t && n !== 1 ? ' start="' + n + '"' : "";
    return "<" + i + s + `>
` + r + "</" + i + `>
`;
  }
  listitem(e) {
    return `<li>${this.parser.parse(e.tokens)}</li>
`;
  }
  checkbox({ checked: e }) {
    return "<input " + (e ? 'checked="" ' : "") + 'disabled="" type="checkbox"> ';
  }
  paragraph({ tokens: e }) {
    return `<p>${this.parser.parseInline(e)}</p>
`;
  }
  table(e) {
    let t = "", n = "";
    for (let i = 0;i < e.header.length; i++)
      n += this.tablecell(e.header[i]);
    t += this.tablerow({ text: n });
    let r = "";
    for (let i = 0;i < e.rows.length; i++) {
      let s = e.rows[i];
      n = "";
      for (let a = 0;a < s.length; a++)
        n += this.tablecell(s[a]);
      r += this.tablerow({ text: n });
    }
    return r && (r = `<tbody>${r}</tbody>`), `<table>
<thead>
` + t + `</thead>
` + r + `</table>
`;
  }
  tablerow({ text: e }) {
    return `<tr>
${e}</tr>
`;
  }
  tablecell(e) {
    let t = this.parser.parseInline(e.tokens), n = e.header ? "th" : "td";
    return (e.align ? `<${n} align="${e.align}">` : `<${n}>`) + t + `</${n}>
`;
  }
  strong({ tokens: e }) {
    return `<strong>${this.parser.parseInline(e)}</strong>`;
  }
  em({ tokens: e }) {
    return `<em>${this.parser.parseInline(e)}</em>`;
  }
  codespan({ text: e }) {
    return `<code>${w(e, true)}</code>`;
  }
  br(e) {
    return "<br>";
  }
  del({ tokens: e }) {
    return `<del>${this.parser.parseInline(e)}</del>`;
  }
  link({ href: e, title: t, tokens: n }) {
    let r = this.parser.parseInline(n), i = X(e);
    if (i === null)
      return r;
    e = i;
    let s = '<a href="' + e + '"';
    return t && (s += ' title="' + w(t) + '"'), s += ">" + r + "</a>", s;
  }
  image({ href: e, title: t, text: n, tokens: r }) {
    r && (n = this.parser.parseInline(r, this.parser.textRenderer));
    let i = X(e);
    if (i === null)
      return w(n);
    e = i;
    let s = `<img src="${e}" alt="${n}"`;
    return t && (s += ` title="${w(t)}"`), s += ">", s;
  }
  text(e) {
    return "tokens" in e && e.tokens ? this.parser.parseInline(e.tokens) : ("escaped" in e) && e.escaped ? e.text : w(e.text);
  }
}, $ = class {
  strong({ text: e }) {
    return e;
  }
  em({ text: e }) {
    return e;
  }
  codespan({ text: e }) {
    return e;
  }
  del({ text: e }) {
    return e;
  }
  html({ text: e }) {
    return e;
  }
  text({ text: e }) {
    return e;
  }
  link({ text: e }) {
    return "" + e;
  }
  image({ text: e }) {
    return "" + e;
  }
  br() {
    return "";
  }
  checkbox({ raw: e }) {
    return e;
  }
}, b = class u2 {
  options;
  renderer;
  textRenderer;
  constructor(e) {
    this.options = e || T, this.options.renderer = this.options.renderer || new P, this.renderer = this.options.renderer, this.renderer.options = this.options, this.renderer.parser = this, this.textRenderer = new $;
  }
  static parse(e, t) {
    return new u2(t).parse(e);
  }
  static parseInline(e, t) {
    return new u2(t).parseInline(e);
  }
  parse(e) {
    let t = "";
    for (let n = 0;n < e.length; n++) {
      let r = e[n];
      if (this.options.extensions?.renderers?.[r.type]) {
        let s = r, a = this.options.extensions.renderers[s.type].call({ parser: this }, s);
        if (a !== false || !["space", "hr", "heading", "code", "table", "blockquote", "list", "html", "def", "paragraph", "text"].includes(s.type)) {
          t += a || "";
          continue;
        }
      }
      let i = r;
      switch (i.type) {
        case "space": {
          t += this.renderer.space(i);
          break;
        }
        case "hr": {
          t += this.renderer.hr(i);
          break;
        }
        case "heading": {
          t += this.renderer.heading(i);
          break;
        }
        case "code": {
          t += this.renderer.code(i);
          break;
        }
        case "table": {
          t += this.renderer.table(i);
          break;
        }
        case "blockquote": {
          t += this.renderer.blockquote(i);
          break;
        }
        case "list": {
          t += this.renderer.list(i);
          break;
        }
        case "checkbox": {
          t += this.renderer.checkbox(i);
          break;
        }
        case "html": {
          t += this.renderer.html(i);
          break;
        }
        case "def": {
          t += this.renderer.def(i);
          break;
        }
        case "paragraph": {
          t += this.renderer.paragraph(i);
          break;
        }
        case "text": {
          t += this.renderer.text(i);
          break;
        }
        default: {
          let s = 'Token with "' + i.type + '" type was not found.';
          if (this.options.silent)
            return console.error(s), "";
          throw new Error(s);
        }
      }
    }
    return t;
  }
  parseInline(e, t = this.renderer) {
    let n = "";
    for (let r = 0;r < e.length; r++) {
      let i = e[r];
      if (this.options.extensions?.renderers?.[i.type]) {
        let a = this.options.extensions.renderers[i.type].call({ parser: this }, i);
        if (a !== false || !["escape", "html", "link", "image", "strong", "em", "codespan", "br", "del", "text"].includes(i.type)) {
          n += a || "";
          continue;
        }
      }
      let s = i;
      switch (s.type) {
        case "escape": {
          n += t.text(s);
          break;
        }
        case "html": {
          n += t.html(s);
          break;
        }
        case "link": {
          n += t.link(s);
          break;
        }
        case "image": {
          n += t.image(s);
          break;
        }
        case "checkbox": {
          n += t.checkbox(s);
          break;
        }
        case "strong": {
          n += t.strong(s);
          break;
        }
        case "em": {
          n += t.em(s);
          break;
        }
        case "codespan": {
          n += t.codespan(s);
          break;
        }
        case "br": {
          n += t.br(s);
          break;
        }
        case "del": {
          n += t.del(s);
          break;
        }
        case "text": {
          n += t.text(s);
          break;
        }
        default: {
          let a = 'Token with "' + s.type + '" type was not found.';
          if (this.options.silent)
            return console.error(a), "";
          throw new Error(a);
        }
      }
    }
    return n;
  }
}, S, B = class {
  defaults = L();
  options = this.setOptions;
  parse = this.parseMarkdown(true);
  parseInline = this.parseMarkdown(false);
  Parser = b;
  Renderer = P;
  TextRenderer = $;
  Lexer = x;
  Tokenizer = y;
  Hooks = S;
  constructor(...e) {
    this.use(...e);
  }
  walkTokens(e, t) {
    let n = [];
    for (let r of e)
      switch (n = n.concat(t.call(this, r)), r.type) {
        case "table": {
          let i = r;
          for (let s of i.header)
            n = n.concat(this.walkTokens(s.tokens, t));
          for (let s of i.rows)
            for (let a of s)
              n = n.concat(this.walkTokens(a.tokens, t));
          break;
        }
        case "list": {
          let i = r;
          n = n.concat(this.walkTokens(i.items, t));
          break;
        }
        default: {
          let i = r;
          this.defaults.extensions?.childTokens?.[i.type] ? this.defaults.extensions.childTokens[i.type].forEach((s) => {
            let a = i[s].flat(1 / 0);
            n = n.concat(this.walkTokens(a, t));
          }) : i.tokens && (n = n.concat(this.walkTokens(i.tokens, t)));
        }
      }
    return n;
  }
  use(...e) {
    let t = this.defaults.extensions || { renderers: {}, childTokens: {} };
    return e.forEach((n) => {
      let r = { ...n };
      if (r.async = this.defaults.async || r.async || false, n.extensions && (n.extensions.forEach((i) => {
        if (!i.name)
          throw new Error("extension name required");
        if ("renderer" in i) {
          let s = t.renderers[i.name];
          s ? t.renderers[i.name] = function(...a) {
            let o = i.renderer.apply(this, a);
            return o === false && (o = s.apply(this, a)), o;
          } : t.renderers[i.name] = i.renderer;
        }
        if ("tokenizer" in i) {
          if (!i.level || i.level !== "block" && i.level !== "inline")
            throw new Error("extension level must be 'block' or 'inline'");
          let s = t[i.level];
          s ? s.unshift(i.tokenizer) : t[i.level] = [i.tokenizer], i.start && (i.level === "block" ? t.startBlock ? t.startBlock.push(i.start) : t.startBlock = [i.start] : i.level === "inline" && (t.startInline ? t.startInline.push(i.start) : t.startInline = [i.start]));
        }
        "childTokens" in i && i.childTokens && (t.childTokens[i.name] = i.childTokens);
      }), r.extensions = t), n.renderer) {
        let i = this.defaults.renderer || new P(this.defaults);
        for (let s in n.renderer) {
          if (!(s in i))
            throw new Error(`renderer '${s}' does not exist`);
          if (["options", "parser"].includes(s))
            continue;
          let a = s, o = n.renderer[a], l = i[a];
          i[a] = (...p) => {
            let c = o.apply(i, p);
            return c === false && (c = l.apply(i, p)), c || "";
          };
        }
        r.renderer = i;
      }
      if (n.tokenizer) {
        let i = this.defaults.tokenizer || new y(this.defaults);
        for (let s in n.tokenizer) {
          if (!(s in i))
            throw new Error(`tokenizer '${s}' does not exist`);
          if (["options", "rules", "lexer"].includes(s))
            continue;
          let a = s, o = n.tokenizer[a], l = i[a];
          i[a] = (...p) => {
            let c = o.apply(i, p);
            return c === false && (c = l.apply(i, p)), c;
          };
        }
        r.tokenizer = i;
      }
      if (n.hooks) {
        let i = this.defaults.hooks || new S;
        for (let s in n.hooks) {
          if (!(s in i))
            throw new Error(`hook '${s}' does not exist`);
          if (["options", "block"].includes(s))
            continue;
          let a = s, o = n.hooks[a], l = i[a];
          S.passThroughHooks.has(s) ? i[a] = (p) => {
            if (this.defaults.async && S.passThroughHooksRespectAsync.has(s))
              return (async () => {
                let g = await o.call(i, p);
                return l.call(i, g);
              })();
            let c = o.call(i, p);
            return l.call(i, c);
          } : i[a] = (...p) => {
            if (this.defaults.async)
              return (async () => {
                let g = await o.apply(i, p);
                return g === false && (g = await l.apply(i, p)), g;
              })();
            let c = o.apply(i, p);
            return c === false && (c = l.apply(i, p)), c;
          };
        }
        r.hooks = i;
      }
      if (n.walkTokens) {
        let i = this.defaults.walkTokens, s = n.walkTokens;
        r.walkTokens = function(a) {
          let o = [];
          return o.push(s.call(this, a)), i && (o = o.concat(i.call(this, a))), o;
        };
      }
      this.defaults = { ...this.defaults, ...r };
    }), this;
  }
  setOptions(e) {
    return this.defaults = { ...this.defaults, ...e }, this;
  }
  lexer(e, t) {
    return x.lex(e, t ?? this.defaults);
  }
  parser(e, t) {
    return b.parse(e, t ?? this.defaults);
  }
  parseMarkdown(e) {
    return (n, r) => {
      let i = { ...r }, s = { ...this.defaults, ...i }, a = this.onError(!!s.silent, !!s.async);
      if (this.defaults.async === true && i.async === false)
        return a(new Error("marked(): The async option was set to true by an extension. Remove async: false from the parse options object to return a Promise."));
      if (typeof n > "u" || n === null)
        return a(new Error("marked(): input parameter is undefined or null"));
      if (typeof n != "string")
        return a(new Error("marked(): input parameter is of type " + Object.prototype.toString.call(n) + ", string expected"));
      if (s.hooks && (s.hooks.options = s, s.hooks.block = e), s.async)
        return (async () => {
          let o = s.hooks ? await s.hooks.preprocess(n) : n, p = await (s.hooks ? await s.hooks.provideLexer() : e ? x.lex : x.lexInline)(o, s), c = s.hooks ? await s.hooks.processAllTokens(p) : p;
          s.walkTokens && await Promise.all(this.walkTokens(c, s.walkTokens));
          let h = await (s.hooks ? await s.hooks.provideParser() : e ? b.parse : b.parseInline)(c, s);
          return s.hooks ? await s.hooks.postprocess(h) : h;
        })().catch(a);
      try {
        s.hooks && (n = s.hooks.preprocess(n));
        let l = (s.hooks ? s.hooks.provideLexer() : e ? x.lex : x.lexInline)(n, s);
        s.hooks && (l = s.hooks.processAllTokens(l)), s.walkTokens && this.walkTokens(l, s.walkTokens);
        let c = (s.hooks ? s.hooks.provideParser() : e ? b.parse : b.parseInline)(l, s);
        return s.hooks && (c = s.hooks.postprocess(c)), c;
      } catch (o) {
        return a(o);
      }
    };
  }
  onError(e, t) {
    return (n) => {
      if (n.message += `
Please report this to https://github.com/markedjs/marked.`, e) {
        let r = "<p>An error occurred:</p><pre>" + w(n.message + "", true) + "</pre>";
        return t ? Promise.resolve(r) : r;
      }
      if (t)
        return Promise.reject(n);
      throw n;
    };
  }
}, _, Dt, Ht, Zt, Gt, Nt, Ft, jt;
var init_marked_esm = __esm(() => {
  T = L();
  C = { exec: () => null };
  me = (() => {
    try {
      return !!new RegExp("(?<=1)(?<!1)");
    } catch {
      return false;
    }
  })();
  m = { codeRemoveIndent: /^(?: {1,4}| {0,3}\t)/gm, outputLinkReplace: /\\([\[\]])/g, indentCodeCompensation: /^(\s+)(?:```)/, beginningSpace: /^\s+/, endingHash: /#$/, startingSpaceChar: /^ /, endingSpaceChar: / $/, nonSpaceChar: /[^ ]/, newLineCharGlobal: /\n/g, tabCharGlobal: /\t/g, multipleSpaceGlobal: /\s+/g, blankLine: /^[ \t]*$/, doubleBlankLine: /\n[ \t]*\n[ \t]*$/, blockquoteStart: /^ {0,3}>/, blockquoteSetextReplace: /\n {0,3}((?:=+|-+) *)(?=\n|$)/g, blockquoteSetextReplace2: /^ {0,3}>[ \t]?/gm, listReplaceTabs: /^\t+/, listReplaceNesting: /^ {1,4}(?=( {4})*[^ ])/g, listIsTask: /^\[[ xX]\] +\S/, listReplaceTask: /^\[[ xX]\] +/, listTaskCheckbox: /\[[ xX]\]/, anyLine: /\n.*\n/, hrefBrackets: /^<(.*)>$/, tableDelimiter: /[:|]/, tableAlignChars: /^\||\| *$/g, tableRowBlankLine: /\n[ \t]*$/, tableAlignRight: /^ *-+: *$/, tableAlignCenter: /^ *:-+: *$/, tableAlignLeft: /^ *:-+ *$/, startATag: /^<a /i, endATag: /^<\/a>/i, startPreScriptTag: /^<(pre|code|kbd|script)(\s|>)/i, endPreScriptTag: /^<\/(pre|code|kbd|script)(\s|>)/i, startAngleBracket: /^</, endAngleBracket: />$/, pedanticHrefTitle: /^([^'"]*[^\s])\s+(['"])(.*)\2/, unicodeAlphaNumeric: /[\p{L}\p{N}]/u, escapeTest: /[&<>"']/, escapeReplace: /[&<>"']/g, escapeTestNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/, escapeReplaceNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g, unescapeTest: /&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/ig, caret: /(^|[^\[])\^/g, percentDecode: /%25/g, findPipe: /\|/g, splitPipe: / \|/, slashPipe: /\\\|/g, carriageReturn: /\r\n|\r/g, spaceLine: /^ +$/gm, notSpaceStart: /^\S*/, endingNewline: /\n$/, listItemRegex: (u) => new RegExp(`^( {0,3}${u})((?:[	 ][^\\n]*)?(?:\\n|$))`), nextBulletRegex: (u) => new RegExp(`^ {0,${Math.min(3, u - 1)}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`), hrRegex: (u) => new RegExp(`^ {0,${Math.min(3, u - 1)}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`), fencesBeginRegex: (u) => new RegExp(`^ {0,${Math.min(3, u - 1)}}(?:\`\`\`|~~~)`), headingBeginRegex: (u) => new RegExp(`^ {0,${Math.min(3, u - 1)}}#`), htmlBeginRegex: (u) => new RegExp(`^ {0,${Math.min(3, u - 1)}}<(?:[a-z].*>|!--)`, "i") };
  xe = /^(?:[ \t]*(?:\n|$))+/;
  be = /^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/;
  Re = /^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/;
  I = /^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/;
  Te = /^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/;
  N = /(?:[*+-]|\d{1,9}[.)])/;
  re = /^(?!bull |blockCode|fences|blockquote|heading|html|table)((?:.|\n(?!\s*?\n|bull |blockCode|fences|blockquote|heading|html|table))+?)\n {0,3}(=+|-+) *(?:\n+|$)/;
  se = k(re).replace(/bull/g, N).replace(/blockCode/g, /(?: {4}| {0,3}\t)/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}/).replace(/html/g, / {0,3}<[^\n>]+>\n/).replace(/\|table/g, "").getRegex();
  Oe = k(re).replace(/bull/g, N).replace(/blockCode/g, /(?: {4}| {0,3}\t)/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}/).replace(/html/g, / {0,3}<[^\n>]+>\n/).replace(/table/g, / {0,3}\|?(?:[:\- ]*\|)+[\:\- ]*\n/).getRegex();
  Q = /^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table| +\n)[^\n]+)*)/;
  we = /^[^\n]+/;
  F = /(?!\s*\])(?:\\[\s\S]|[^\[\]\\])+/;
  ye = k(/^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/).replace("label", F).replace("title", /(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/).getRegex();
  Pe = k(/^( {0,3}bull)([ \t][^\n]+?)?(?:\n|$)/).replace(/bull/g, N).getRegex();
  j = /<!--(?:-?>|[\s\S]*?(?:-->|$))/;
  Se = k("^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>\\n*|$)|<![A-Z][\\s\\S]*?(?:>\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n[ \t]*)+\\n|$)|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ \t]*)+\\n|$)|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ \t]*)+\\n|$))", "i").replace("comment", j).replace("tag", v).replace("attribute", / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex();
  ie = k(Q).replace("hr", I).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("|table", "").replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", v).getRegex();
  $e = k(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/).replace("paragraph", ie).getRegex();
  U = { blockquote: $e, code: be, def: ye, fences: Re, heading: Te, hr: I, html: Se, lheading: se, list: Pe, newline: xe, paragraph: ie, table: C, text: we };
  te = k("^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)").replace("hr", I).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("blockquote", " {0,3}>").replace("code", "(?: {4}| {0,3}\t)[^\\n]").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", v).getRegex();
  _e = { ...U, lheading: Oe, table: te, paragraph: k(Q).replace("hr", I).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("table", te).replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", v).getRegex() };
  Le = { ...U, html: k(`^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`).replace("comment", j).replace(/tag/g, "(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(), def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/, heading: /^(#{1,6})(.*)(?:\n+|$)/, fences: C, lheading: /^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/, paragraph: k(Q).replace("hr", I).replace("heading", ` *#{1,6} *[^
]`).replace("lheading", se).replace("|table", "").replace("blockquote", " {0,3}>").replace("|fences", "").replace("|list", "").replace("|html", "").replace("|tag", "").getRegex() };
  Me = /^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/;
  ze = /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/;
  oe = /^( {2,}|\\)\n(?!\s*$)/;
  Ae = /^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/;
  D = /[\p{P}\p{S}]/u;
  K = /[\s\p{P}\p{S}]/u;
  ae = /[^\s\p{P}\p{S}]/u;
  Ce = k(/^((?![*_])punctSpace)/, "u").replace(/punctSpace/g, K).getRegex();
  le = /(?!~)[\p{P}\p{S}]/u;
  Ie = /(?!~)[\s\p{P}\p{S}]/u;
  Ee = /(?:[^\s\p{P}\p{S}]|~)/u;
  Be = k(/link|precode-code|html/, "g").replace("link", /\[(?:[^\[\]`]|(?<a>`+)[^`]+\k<a>(?!`))*?\]\((?:\\[\s\S]|[^\\\(\)]|\((?:\\[\s\S]|[^\\\(\)])*\))*\)/).replace("precode-", me ? "(?<!`)()" : "(^^|[^`])").replace("code", /(?<b>`+)[^`]+\k<b>(?!`)/).replace("html", /<(?! )[^<>]*?>/).getRegex();
  ue = /^(?:\*+(?:((?!\*)punct)|[^\s*]))|^_+(?:((?!_)punct)|([^\s_]))/;
  qe = k(ue, "u").replace(/punct/g, D).getRegex();
  ve = k(ue, "u").replace(/punct/g, le).getRegex();
  De = k(pe, "gu").replace(/notPunctSpace/g, ae).replace(/punctSpace/g, K).replace(/punct/g, D).getRegex();
  He = k(pe, "gu").replace(/notPunctSpace/g, Ee).replace(/punctSpace/g, Ie).replace(/punct/g, le).getRegex();
  Ze = k("^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)punctSpace(_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)", "gu").replace(/notPunctSpace/g, ae).replace(/punctSpace/g, K).replace(/punct/g, D).getRegex();
  Ge = k(/\\(punct)/, "gu").replace(/punct/g, D).getRegex();
  Ne = k(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/).replace("scheme", /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/).replace("email", /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/).getRegex();
  Qe = k(j).replace("(?:-->|$)", "-->").getRegex();
  Fe = k("^comment|^</[a-zA-Z][\\w:-]*\\s*>|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>").replace("comment", Qe).replace("attribute", /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/).getRegex();
  q = /(?:\[(?:\\[\s\S]|[^\[\]\\])*\]|\\[\s\S]|`+[^`]*?`+(?!`)|[^\[\]\\`])*?/;
  je = k(/^!?\[(label)\]\(\s*(href)(?:(?:[ \t]*(?:\n[ \t]*)?)(title))?\s*\)/).replace("label", q).replace("href", /<(?:\\.|[^\n<>\\])+>|[^ \t\n\x00-\x1f]*/).replace("title", /"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/).getRegex();
  ce = k(/^!?\[(label)\]\[(ref)\]/).replace("label", q).replace("ref", F).getRegex();
  he = k(/^!?\[(ref)\](?:\[\])?/).replace("ref", F).getRegex();
  Ue = k("reflink|nolink(?!\\()", "g").replace("reflink", ce).replace("nolink", he).getRegex();
  ne = /[hH][tT][tT][pP][sS]?|[fF][tT][pP]/;
  W = { _backpedal: C, anyPunctuation: Ge, autolink: Ne, blockSkip: Be, br: oe, code: ze, del: C, emStrongLDelim: qe, emStrongRDelimAst: De, emStrongRDelimUnd: Ze, escape: Me, link: je, nolink: he, punctuation: Ce, reflink: ce, reflinkSearch: Ue, tag: Fe, text: Ae, url: C };
  Ke = { ...W, link: k(/^!?\[(label)\]\((.*?)\)/).replace("label", q).getRegex(), reflink: k(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label", q).getRegex() };
  G = { ...W, emStrongRDelimAst: He, emStrongLDelim: ve, url: k(/^((?:protocol):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/).replace("protocol", ne).replace("email", /[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/).getRegex(), _backpedal: /(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/, del: /^(~~?)(?=[^\s~])((?:\\[\s\S]|[^\\])*?(?:\\[\s\S]|[^\s~\\]))\1(?=[^~]|$)/, text: k(/^([`~]+|[^`~])(?:(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|protocol:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/).replace("protocol", ne).getRegex() };
  We = { ...G, br: k(oe).replace("{2,}", "*").getRegex(), text: k(G.text).replace("\\b_", "\\b_| {2,}\\n").replace(/\{2,\}/g, "*").getRegex() };
  E = { normal: U, gfm: _e, pedantic: Le };
  M = { normal: W, gfm: G, breaks: We, pedantic: Ke };
  Xe = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  S = class {
    options;
    block;
    constructor(e) {
      this.options = e || T;
    }
    static passThroughHooks = new Set(["preprocess", "postprocess", "processAllTokens", "emStrongMask"]);
    static passThroughHooksRespectAsync = new Set(["preprocess", "postprocess", "processAllTokens"]);
    preprocess(e) {
      return e;
    }
    postprocess(e) {
      return e;
    }
    processAllTokens(e) {
      return e;
    }
    emStrongMask(e) {
      return e;
    }
    provideLexer() {
      return this.block ? x.lex : x.lexInline;
    }
    provideParser() {
      return this.block ? b.parse : b.parseInline;
    }
  };
  _ = new B;
  d.options = d.setOptions = function(u3) {
    return _.setOptions(u3), d.defaults = _.defaults, Z(d.defaults), d;
  };
  d.getDefaults = L;
  d.defaults = T;
  d.use = function(...u3) {
    return _.use(...u3), d.defaults = _.defaults, Z(d.defaults), d;
  };
  d.walkTokens = function(u3, e) {
    return _.walkTokens(u3, e);
  };
  d.parseInline = _.parseInline;
  d.Parser = b;
  d.parser = b.parse;
  d.Renderer = P;
  d.TextRenderer = $;
  d.Lexer = x;
  d.lexer = x.lex;
  d.Tokenizer = y;
  d.Hooks = S;
  d.parse = d;
  Dt = d.options;
  Ht = d.setOptions;
  Zt = d.use;
  Gt = d.walkTokens;
  Nt = d.parseInline;
  Ft = b.parse;
  jt = x.lex;
});

// src/cli/complete.ts
init_repo();
init_lib();
import { execSync as execSync2 } from "node:child_process";
import { existsSync as existsSync6 } from "node:fs";
import { join as join8 } from "node:path";

// src/lib/complete.ts
init_lib();
import { join as join4 } from "path";
import { writeFileSync as writeFileSync2 } from "fs";
init_repo();
init_tasks();

// src/lib/metrics.ts
init_tasks();
init_lib();
function evaluateStream(repoRoot, streamId) {
  const index = loadIndex(repoRoot);
  const stream = findStream(index, streamId);
  if (!stream) {
    throw new Error(`Workstream "${streamId}" not found`);
  }
  const tasks = getTasks(repoRoot, stream.id);
  const statusCounts = {
    pending: 0,
    in_progress: 0,
    completed: 0,
    blocked: 0,
    cancelled: 0
  };
  for (const task of tasks) {
    statusCounts[task.status]++;
  }
  const total = tasks.length;
  const completionRate = total > 0 ? statusCounts.completed / total * 100 : 0;
  const blockedRate = total > 0 ? statusCounts.blocked / total * 100 : 0;
  const cancelledRate = total > 0 ? statusCounts.cancelled / total * 100 : 0;
  return {
    streamId: stream.id,
    streamName: stream.name,
    totalTasks: total,
    statusCounts,
    completionRate,
    blockedRate,
    cancelledRate,
    inProgressCount: statusCounts.in_progress
  };
}

// src/lib/complete.ts
function calculateTaskDuration(task) {
  if (!task.created_at || !task.updated_at) {
    return null;
  }
  const created = new Date(task.created_at).getTime();
  const updated = new Date(task.updated_at).getTime();
  if (isNaN(created) || isNaN(updated)) {
    return null;
  }
  return Math.max(0, updated - created);
}
function formatDuration(ms) {
  if (ms < 1000) {
    return "<1s";
  }
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  const remainingSeconds = seconds % 60;
  const parts = [];
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (remainingMinutes > 0 || hours > 0) {
    parts.push(`${remainingMinutes}m`);
  }
  if (remainingSeconds > 0 || parts.length === 0) {
    parts.push(`${remainingSeconds}s`);
  }
  return parts.join(" ");
}
function calculateStageMetrics(tasks) {
  const stageMap = new Map;
  for (const task of tasks) {
    if (task.status !== "completed")
      continue;
    const duration = calculateTaskDuration(task);
    if (duration === null)
      continue;
    const stageName = task.stage_name || "Unknown Stage";
    if (!stageMap.has(stageName)) {
      stageMap.set(stageName, { durations: [] });
    }
    stageMap.get(stageName).durations.push(duration);
  }
  const results = [];
  for (const [stageName, data] of stageMap) {
    const totalTimeMs = data.durations.reduce((a, b) => a + b, 0);
    const avgTimeMs = data.durations.length > 0 ? totalTimeMs / data.durations.length : 0;
    results.push({
      stageName,
      taskCount: data.durations.length,
      avgTimeMs,
      totalTimeMs
    });
  }
  return results.sort((a, b) => a.stageName.localeCompare(b.stageName));
}
function calculateAgentMetrics(tasks) {
  const agentMap = new Map;
  for (const task of tasks) {
    if (task.status !== "completed")
      continue;
    const duration = calculateTaskDuration(task);
    if (duration === null)
      continue;
    const agentName = task.assigned_agent || "default";
    if (!agentMap.has(agentName)) {
      agentMap.set(agentName, { durations: [] });
    }
    agentMap.get(agentName).durations.push(duration);
  }
  const results = [];
  for (const [agentName, data] of agentMap) {
    const totalTimeMs = data.durations.reduce((a, b) => a + b, 0);
    const avgTimeMs = data.durations.length > 0 ? totalTimeMs / data.durations.length : 0;
    results.push({
      agentName,
      taskCount: data.durations.length,
      avgTimeMs
    });
  }
  return results.sort((a, b) => b.taskCount - a.taskCount || a.agentName.localeCompare(b.agentName));
}
function calculateOverallTimingMetrics(tasks) {
  const completedTasks = tasks.filter((t) => t.status === "completed");
  const createdTimestamps = [];
  const updatedTimestamps = [];
  const durations = [];
  for (const task of completedTasks) {
    if (task.created_at) {
      const created = new Date(task.created_at).getTime();
      if (!isNaN(created)) {
        createdTimestamps.push(created);
      }
    }
    if (task.updated_at) {
      const updated = new Date(task.updated_at).getTime();
      if (!isNaN(updated)) {
        updatedTimestamps.push(updated);
      }
    }
    const duration = calculateTaskDuration(task);
    if (duration !== null) {
      durations.push(duration);
    }
  }
  let totalDurationMs = null;
  if (createdTimestamps.length > 0 && updatedTimestamps.length > 0) {
    const firstCreated = Math.min(...createdTimestamps);
    const lastUpdated = Math.max(...updatedTimestamps);
    totalDurationMs = lastUpdated - firstCreated;
  }
  let fastestTaskMs = null;
  let slowestTaskMs = null;
  if (durations.length > 0) {
    fastestTaskMs = Math.min(...durations);
    slowestTaskMs = Math.max(...durations);
  }
  return {
    totalDurationMs,
    fastestTaskMs,
    slowestTaskMs
  };
}
function completeStream(args) {
  const index = loadIndex(args.repoRoot);
  const streamIndex = index.streams.findIndex((s) => s.id === args.streamId || s.name === args.streamId);
  if (streamIndex === -1) {
    throw new Error(`Workstream "${args.streamId}" not found`);
  }
  const stream = index.streams[streamIndex];
  if (!stream) {
    throw new Error(`Workstream at index ${streamIndex} not found`);
  }
  const now = new Date().toISOString();
  stream.status = "completed";
  stream.updated_at = now;
  saveIndex(args.repoRoot, index);
  const completionPath = generateCompletionMd({
    repoRoot: args.repoRoot,
    streamId: stream.id
  });
  return {
    streamId: stream.id,
    completedAt: now,
    completionPath
  };
}
function generateCompletionMd(args) {
  const index = loadIndex(args.repoRoot);
  const stream = findStream(index, args.streamId);
  if (!stream) {
    throw new Error(`Workstream "${args.streamId}" not found`);
  }
  const workDir = getWorkDir(args.repoRoot);
  const streamDir = join4(workDir, stream.id);
  const tasks = getTasks(args.repoRoot, stream.id);
  const metrics = evaluateStream(args.repoRoot, stream.id);
  const grouped = groupTasksByHierarchy(tasks);
  let stageCount = 0;
  let batchCount = 0;
  let threadCount = 0;
  for (const stageMap of grouped.values()) {
    stageCount++;
    for (const batchMap of stageMap.values()) {
      batchCount++;
      threadCount += batchMap.size;
    }
  }
  const overallTiming = calculateOverallTimingMetrics(tasks);
  const stageMetrics = calculateStageMetrics(tasks);
  const agentMetrics = calculateAgentMetrics(tasks);
  const lines = [];
  lines.push(`# Metrics: ${stream.name}`);
  lines.push("");
  lines.push(`**Stream ID:** \`${stream.id}\``);
  lines.push(`**Completed At:** ${new Date().toISOString()}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Tasks | ${metrics.statusCounts.completed}/${metrics.totalTasks} |`);
  lines.push(`| Completion Rate | ${metrics.completionRate.toFixed(1)}% |`);
  lines.push(`| Stages | ${stageCount} |`);
  lines.push(`| Batches | ${batchCount} |`);
  lines.push(`| Threads | ${threadCount} |`);
  lines.push(`| Total Duration | ${overallTiming.totalDurationMs !== null ? formatDuration(overallTiming.totalDurationMs) : "-"} |`);
  lines.push(`| Fastest Task | ${overallTiming.fastestTaskMs !== null ? formatDuration(overallTiming.fastestTaskMs) : "-"} |`);
  lines.push(`| Slowest Task | ${overallTiming.slowestTaskMs !== null ? formatDuration(overallTiming.slowestTaskMs) : "-"} |`);
  lines.push("");
  lines.push("## Status Breakdown");
  lines.push("");
  lines.push(`| Status | Count |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Completed | ${metrics.statusCounts.completed} |`);
  lines.push(`| In Progress | ${metrics.statusCounts.in_progress} |`);
  lines.push(`| Pending | ${metrics.statusCounts.pending} |`);
  lines.push(`| Blocked | ${metrics.statusCounts.blocked} |`);
  lines.push(`| Cancelled | ${metrics.statusCounts.cancelled} |`);
  lines.push("");
  lines.push("## Stage Performance");
  lines.push("");
  if (stageMetrics.length > 0) {
    lines.push(`| Stage | Tasks | Avg Time | Total Time |`);
    lines.push(`|-------|-------|----------|------------|`);
    for (const stage of stageMetrics) {
      lines.push(`| ${stage.stageName} | ${stage.taskCount} | ${formatDuration(stage.avgTimeMs)} | ${formatDuration(stage.totalTimeMs)} |`);
    }
  } else {
    lines.push("No completed tasks with timing data.");
  }
  lines.push("");
  lines.push("## Agent Performance");
  lines.push("");
  if (agentMetrics.length > 0) {
    lines.push(`| Agent | Tasks | Avg Time |`);
    lines.push(`|-------|-------|----------|`);
    for (const agent of agentMetrics) {
      lines.push(`| ${agent.agentName} | ${agent.taskCount} | ${formatDuration(agent.avgTimeMs)} |`);
    }
  } else {
    lines.push("No completed tasks with timing data.");
  }
  lines.push("");
  const content = lines.join(`
`);
  const outputPath = join4(streamDir, "METRICS.md");
  writeFileSync2(outputPath, content);
  return outputPath;
}
function groupTasksByHierarchy(tasks) {
  const grouped = new Map;
  for (const task of tasks) {
    const stageName = task.stage_name || "Stage 01";
    const batchName = task.batch_name || "Batch 01";
    const threadName = task.thread_name || "Thread 01";
    if (!grouped.has(stageName)) {
      grouped.set(stageName, new Map);
    }
    const stageMap = grouped.get(stageName);
    if (!stageMap.has(batchName)) {
      stageMap.set(batchName, new Map);
    }
    const batchMap = stageMap.get(batchName);
    if (!batchMap.has(threadName)) {
      batchMap.set(threadName, []);
    }
    batchMap.get(threadName).push(task);
  }
  return grouped;
}

// src/lib/consolidate.ts
import { existsSync as existsSync5, readFileSync as readFileSync4 } from "fs";
import { join as join5 } from "path";

// src/lib/stream-parser.ts
init_marked_esm();
function extractTextFromTokens(tokens) {
  let text = "";
  for (const token of tokens) {
    if (token.type === "paragraph") {
      const para = token;
      text += para.text + `
`;
    } else if (token.type === "text") {
      const txt = token;
      text += txt.text + `
`;
    }
  }
  return text.trim();
}
function extractListItems(tokens) {
  const items = [];
  for (const token of tokens) {
    if (token.type === "list") {
      const list = token;
      for (const item of list.items) {
        items.push(item.text.trim());
      }
    }
  }
  return items;
}
function extractStreamName(tokens) {
  for (const token of tokens) {
    if (token.type === "heading") {
      const heading = token;
      if (heading.depth === 1) {
        const match = heading.text.match(/^Plan:\s*(.+)$/i);
        if (match) {
          return match[1].trim();
        }
      }
    }
  }
  return null;
}
function findSectionContent(tokens, sectionName) {
  const sectionTokens = [];
  let inSection = false;
  for (const token of tokens) {
    if (token.type === "heading") {
      const heading = token;
      if (heading.depth === 2) {
        if (heading.text.toLowerCase() === sectionName.toLowerCase()) {
          inSection = true;
          continue;
        } else if (inSection) {
          break;
        }
      }
    }
    if (inSection) {
      sectionTokens.push(token);
    }
  }
  return sectionTokens;
}
function extractSummary(tokens) {
  const sectionTokens = findSectionContent(tokens, "Summary");
  return extractTextFromTokens(sectionTokens);
}
function extractReferences(tokens) {
  const sectionTokens = findSectionContent(tokens, "References");
  return extractListItems(sectionTokens);
}
function parseStageHeading(text) {
  const match = text.match(/^Stage\s+(\d+):\s*(.*)$/i);
  if (match) {
    return {
      number: parseInt(match[1], 10),
      name: match[2].trim()
    };
  }
  return null;
}
function parseBatchHeading(text) {
  const match = text.match(/^Batch\s+(\d{1,2}):\s*(.*)$/i);
  if (match) {
    const num = parseInt(match[1], 10);
    return {
      number: num,
      prefix: num.toString().padStart(2, "0"),
      name: match[2].trim()
    };
  }
  return null;
}
function parseThreadHeading(text) {
  const match = text.match(/^Thread\s+(\d+):\s*(.*)$/i);
  if (match) {
    return {
      number: parseInt(match[1], 10),
      name: match[2].trim()
    };
  }
  return null;
}
function detectThreadSection(text) {
  const trimmed = text.trim().toLowerCase();
  if (/^\**summary/i.test(trimmed))
    return "summary";
  if (/^\**details/i.test(trimmed))
    return "details";
  return null;
}
function parseQuestions(items) {
  return items.map((item) => {
    const checkMatch = item.match(/^\[([x ])\]\s*(.*)$/im);
    if (checkMatch) {
      return {
        question: checkMatch[2].trim(),
        resolved: checkMatch[1].toLowerCase() === "x"
      };
    }
    const firstLine = item.split(`
`)[0].trim();
    return {
      question: firstLine,
      resolved: false
    };
  });
}
function parseStreamDocument(content, errors) {
  const lexer = new x;
  const tokens = lexer.lex(content);
  const streamName = extractStreamName(tokens);
  if (!streamName) {
    errors.push({
      section: "Header",
      message: 'Missing or invalid workstream name. Expected "# Plan: {name}"'
    });
    return null;
  }
  const summary = extractSummary(tokens);
  if (!summary) {
    errors.push({
      section: "Summary",
      message: "Missing or empty Summary section"
    });
  }
  const references = extractReferences(tokens);
  const stages = parseStages(tokens, errors);
  return {
    streamName,
    summary: summary || "",
    references,
    stages
  };
}
function parseStages(tokens, errors) {
  const stages = [];
  const stagesTokens = findSectionContent(tokens, "Stages");
  let currentStage = null;
  let state = {
    currentStage: null,
    currentSection: null,
    currentBatch: null,
    currentThread: null,
    currentThreadSection: null
  };
  let definitionBuffer = [];
  let constitutionBuffer = [];
  let questionsBuffer = [];
  let currentBatch = null;
  let batchSummaryBuffer = [];
  let currentThread = null;
  let threadSummaryBuffer = [];
  let threadDetailsBuffer = [];
  function saveCurrentThread() {
    if (currentThread && currentBatch) {
      currentThread.summary = threadSummaryBuffer.join(`
`).trim();
      currentThread.details = threadDetailsBuffer.join(`
`).trim();
      currentBatch.threads.push(currentThread);
    }
    currentThread = null;
    threadSummaryBuffer = [];
    threadDetailsBuffer = [];
  }
  function saveCurrentBatch() {
    if (currentBatch && currentStage) {
      saveCurrentThread();
      currentBatch.summary = batchSummaryBuffer.join(`
`).trim();
      currentStage.batches.push(currentBatch);
    }
    currentBatch = null;
    batchSummaryBuffer = [];
  }
  function saveCurrentStage() {
    if (currentStage) {
      currentStage.definition = definitionBuffer.join(`
`).trim();
      currentStage.constitution = constitutionBuffer.join(`
`).trim();
      currentStage.questions = parseQuestions(questionsBuffer);
      saveCurrentBatch();
      stages.push(currentStage);
    }
    currentStage = null;
    definitionBuffer = [];
    constitutionBuffer = [];
    questionsBuffer = [];
  }
  for (const token of stagesTokens) {
    if (token.type === "heading") {
      const heading = token;
      if (heading.depth === 3) {
        const stageInfo = parseStageHeading(heading.text);
        if (stageInfo) {
          saveCurrentStage();
          currentStage = {
            id: stageInfo.number,
            name: stageInfo.name,
            definition: "",
            constitution: "",
            questions: [],
            batches: []
          };
          state.currentStage = stageInfo.number;
          state.currentSection = null;
          state.currentBatch = null;
          state.currentThread = null;
        }
      }
      if (heading.depth === 4 && currentStage) {
        const lower = heading.text.toLowerCase();
        if (lower.includes("definition")) {
          state.currentSection = "definition";
        } else if (lower.includes("constitution")) {
          state.currentSection = "constitution";
        } else if (lower.includes("questions")) {
          state.currentSection = "questions";
        } else if (lower.includes("batches") || lower.includes("threads")) {
          state.currentSection = "batches";
          state.currentBatch = null;
          state.currentThread = null;
        } else {
          state.currentSection = null;
        }
      }
      if (heading.depth === 5 && state.currentSection === "batches") {
        const batchInfo = parseBatchHeading(heading.text);
        if (batchInfo && currentStage) {
          saveCurrentBatch();
          currentBatch = {
            id: batchInfo.number,
            prefix: batchInfo.prefix,
            name: batchInfo.name,
            summary: "",
            threads: []
          };
          state.currentBatch = batchInfo.number;
          state.currentThread = null;
          state.currentThreadSection = null;
          continue;
        }
      }
      if (heading.depth === 6 && state.currentSection === "batches" && currentBatch) {
        const threadInfo = parseThreadHeading(heading.text);
        if (threadInfo) {
          saveCurrentThread();
          currentThread = {
            id: threadInfo.number,
            name: threadInfo.name,
            summary: "",
            details: ""
          };
          state.currentThread = threadInfo.number;
          state.currentThreadSection = null;
        }
      }
      continue;
    }
    if (token.type === "paragraph") {
      const para = token;
      let text = para.text;
      if (state.currentSection === "constitution") {}
      if (state.currentSection === "batches" && currentThread) {
        const threadSection = detectThreadSection(text);
        if (threadSection) {
          state.currentThreadSection = threadSection;
          text = text.replace(/^\s*\**\s*(summary|details)\s*:?\s*\**\s*:?\s*/i, "").trim();
          if (!text) {
            continue;
          }
        }
      }
      if (state.currentSection === "definition") {
        if (!text.startsWith("<!--")) {
          definitionBuffer.push(text);
        }
      } else if (state.currentSection === "constitution") {
        if (!text.startsWith("<!--")) {
          constitutionBuffer.push(text);
        }
      } else if (state.currentSection === "batches" && currentBatch && !currentThread) {
        if (!text.startsWith("<!--")) {
          batchSummaryBuffer.push(text);
        }
      } else if (state.currentSection === "batches" && currentThread) {
        if (!text.startsWith("<!--")) {
          if (state.currentThreadSection === "summary") {
            threadSummaryBuffer.push(text);
          } else if (state.currentThreadSection === "details") {
            threadDetailsBuffer.push(text);
          }
        }
      }
    }
    if (token.type === "list") {
      const list = token;
      if (state.currentSection === "constitution") {
        const items = list.items.map((item) => item.text.trim());
        constitutionBuffer.push(...items.map((item) => `- ${item}`));
      } else if (state.currentSection === "questions") {
        const questionItems = list.items.map((item) => {
          if (item.task) {
            const prefix = item.checked ? "[x]" : "[ ]";
            return `${prefix} ${item.text.trim()}`;
          }
          return item.text.trim();
        });
        questionsBuffer.push(...questionItems);
      } else if (state.currentSection === "batches" && currentThread) {
        if (state.currentThreadSection === "details") {
          const items = list.items.map((item) => item.text.trim());
          threadDetailsBuffer.push(...items.map((item) => `- ${item}`));
        }
      }
    }
    if (token.type === "code" && state.currentSection === "batches" && currentThread) {
      if (state.currentThreadSection === "details") {
        const code = token;
        threadDetailsBuffer.push("```" + (code.lang || "") + `
` + code.text + "\n```");
      }
    }
  }
  saveCurrentStage();
  return stages;
}

// src/lib/consolidate.ts
init_repo();
function getStreamPlanMdPath(repoRoot, streamId) {
  const workDir = getWorkDir(repoRoot);
  return join5(workDir, streamId, "PLAN.md");
}
function validateStreamDocument(doc, errors, warnings) {
  if (!doc.summary || doc.summary.trim().length === 0) {
    warnings.push("Summary section is empty");
  }
  if (doc.stages.length === 0) {
    errors.push({
      section: "Stages",
      message: "No stages found. At least one stage is required."
    });
    return;
  }
  for (const stage of doc.stages) {
    const stagePrefix = `Stage ${stage.id}`;
    if (!stage.name || stage.name.trim().length === 0 || stage.name.includes("<!--")) {
      warnings.push(`${stagePrefix}: Stage name is empty or contains placeholder`);
    }
    if (!stage.definition || stage.definition.trim().length === 0) {
      warnings.push(`${stagePrefix}: Stage Definition is empty`);
    }
    const totalThreads = stage.batches.reduce((sum, b2) => sum + b2.threads.length, 0);
    if (totalThreads === 0) {
      warnings.push(`${stagePrefix}: No threads defined`);
    }
    for (const batch of stage.batches) {
      for (const thread of batch.threads) {
        const threadPrefix = `Stage ${stage.id}, Batch ${batch.prefix}, Thread ${thread.id}`;
        if (!thread.name || thread.name.trim().length === 0 || thread.name.includes("<!--")) {
          warnings.push(`${threadPrefix}: Thread name is empty or contains placeholder`);
        }
      }
    }
  }
}
function consolidateStream(repoRoot, streamId, _dryRun = false) {
  const errors = [];
  const warnings = [];
  const planMdPath = getStreamPlanMdPath(repoRoot, streamId);
  if (!existsSync5(planMdPath)) {
    errors.push({
      section: "File",
      message: `PLAN.md not found at ${planMdPath}`
    });
    return {
      success: false,
      streamDocument: null,
      tasksGenerated: [],
      errors,
      warnings
    };
  }
  const content = readFileSync4(planMdPath, "utf-8");
  const streamDocument = parseStreamDocument(content, errors);
  if (!streamDocument) {
    return {
      success: false,
      streamDocument: null,
      tasksGenerated: [],
      errors,
      warnings
    };
  }
  validateStreamDocument(streamDocument, errors, warnings);
  return {
    success: errors.length === 0,
    streamDocument,
    tasksGenerated: [],
    errors,
    warnings
  };
}

// src/cli/complete.ts
init_tasks();

// src/lib/approval.ts
init_lib();
init_repo();
function getApprovalStatus(stream) {
  return stream.approval?.status ?? "draft";
}
function isApproved(stream) {
  return getApprovalStatus(stream) === "approved";
}
function getStageApprovalStatus(stream, stageNumber) {
  if (!stream.approval?.stages) {
    return "draft";
  }
  return stream.approval.stages[stageNumber]?.status ?? "draft";
}

// src/lib/github/config.ts
import { join as join6, dirname as dirname2 } from "node:path";
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
  return join6(repoRoot, "work", "github.json");
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
async function isGitHubEnabled(repoRoot) {
  const config = await loadGitHubConfig(repoRoot);
  return config.enabled;
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
init_lib();
function formatBranchName(config, streamId) {
  const prefix = config.branch_prefix || "workstream/";
  return `${prefix}${streamId}`;
}
async function workstreamBranchExists(repoRoot, streamId) {
  const config = await loadGitHubConfig(repoRoot);
  if (!config.enabled || !config.owner || !config.repo) {
    return false;
  }
  const token = await ensureGitHubAuth();
  const client = createGitHubClient(token, config.owner, config.repo);
  const branchName = formatBranchName(config, streamId);
  try {
    await client.getBranch(branchName);
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes("404")) {
      return false;
    }
    throw error;
  }
}
function getWorkstreamBranchName(repoRoot, streamId) {
  const index = loadIndex(repoRoot);
  const stream = getStream(index, streamId);
  return stream.github?.branch;
}

// src/lib/roles.ts
var COMMAND_PERMISSIONS = {
  approve: {
    allowedRoles: ["USER"],
    denialMessage: "Approval requires human oversight. Ask the user to run `work approve <target>`"
  },
  start: {
    allowedRoles: ["USER"],
    denialMessage: "Starting a workstream requires human approval. Ask the user to run `work start`"
  },
  complete: {
    allowedRoles: ["USER"],
    denialMessage: "Completing a workstream requires human approval. Ask the user to run `work complete`"
  },
  status: { allowedRoles: ["USER", "AGENT"] },
  list: { allowedRoles: ["USER", "AGENT"] },
  tree: { allowedRoles: ["USER", "AGENT"] },
  update: { allowedRoles: ["USER", "AGENT"] },
  review: { allowedRoles: ["USER", "AGENT"] },
  current: { allowedRoles: ["USER", "AGENT"] },
  init: { allowedRoles: ["USER", "AGENT"] },
  fix: { allowedRoles: ["USER", "AGENT"] },
  generate: { allowedRoles: ["USER", "AGENT"] },
  delete: { allowedRoles: ["USER", "AGENT"] },
  plan: { allowedRoles: ["USER", "AGENT"] },
  agents: { allowedRoles: ["USER", "AGENT"] },
  prompts: { allowedRoles: ["USER", "AGENT"] }
};
function getCurrentRole() {
  const envRole = process.env.WORKSTREAM_ROLE?.toUpperCase();
  if (envRole === "USER")
    return "USER";
  return "AGENT";
}
function canExecuteCommand(command) {
  const permission = COMMAND_PERMISSIONS[command];
  if (!permission)
    return true;
  return permission.allowedRoles.includes(getCurrentRole());
}
function getRoleDenialMessage(command) {
  const role = getCurrentRole();
  const permission = COMMAND_PERMISSIONS[command];
  if (role === "AGENT") {
    const agentMessage = permission?.denialMessage || `This command requires human approval. Ask the user to run \`work ${command}\``;
    return `Access denied: ${agentMessage}`;
  }
  const baseMessage = permission?.denialMessage || `This command is not available`;
  return `Access denied: ${baseMessage}`;
}

// src/lib/report-template.ts
init_marked_esm();
init_lib();
init_repo();
import { join as join7 } from "path";
import { readFileSync as readFileSync5 } from "fs";
function parseReport(repoRoot, streamId) {
  const index = loadIndex(repoRoot);
  const stream = findStream(index, streamId);
  if (!stream) {
    throw new Error(`Workstream "${streamId}" not found`);
  }
  const workDir = getWorkDir(repoRoot);
  const reportPath = join7(workDir, stream.id, "REPORT.md");
  const content = readFileSync5(reportPath, "utf-8");
  const lexer = new x;
  const tokens = lexer.lex(content);
  const report = {
    streamId: stream.id,
    streamName: stream.name,
    reportedDate: "",
    summary: "",
    accomplishments: [],
    fileReferences: [],
    issues: "",
    nextSteps: ""
  };
  let currentSection = null;
  let currentStage = null;
  let inKeyChanges = false;
  for (let i = 0;i < tokens.length; i++) {
    const token = tokens[i];
    if (!token)
      continue;
    if (token.type === "blockquote") {
      const blockquote = token;
      const text = extractTextFromTokens2(blockquote.tokens);
      const dateMatch = text.match(/\*\*Reported:\*\*\s*(\S+)/);
      if (dateMatch && dateMatch[1]) {
        report.reportedDate = dateMatch[1];
      }
    }
    if (token.type === "heading") {
      const heading = token;
      const text = heading.text;
      if (heading.depth === 2) {
        if (text === "Summary") {
          currentSection = "summary";
          currentStage = null;
          inKeyChanges = false;
        } else if (text === "Accomplishments") {
          currentSection = "accomplishments";
          currentStage = null;
          inKeyChanges = false;
        } else if (text === "File References") {
          currentSection = "fileReferences";
          currentStage = null;
          inKeyChanges = false;
        } else if (text.includes("Issues")) {
          currentSection = "issues";
          currentStage = null;
          inKeyChanges = false;
        } else if (text === "Next Steps") {
          currentSection = "nextSteps";
          currentStage = null;
          inKeyChanges = false;
        }
      } else if (heading.depth === 3 && currentSection === "accomplishments") {
        const stageMatch = text.match(/Stage\s+(\d+):\s*(.+)/);
        if (stageMatch && stageMatch[1] && stageMatch[2]) {
          if (currentStage) {
            report.accomplishments.push({
              stageNumber: currentStage.stageNumber,
              stageName: currentStage.stageName,
              description: currentStage.description.trim(),
              keyChanges: currentStage.keyChanges
            });
          }
          currentStage = {
            stageNumber: parseInt(stageMatch[1], 10),
            stageName: stageMatch[2],
            description: "",
            keyChanges: []
          };
          inKeyChanges = false;
        }
      } else if (heading.depth === 4 && currentStage && text === "Key Changes") {
        inKeyChanges = true;
      }
    }
    if (token.type === "paragraph") {
      const para = token;
      const text = para.text;
      if (text.startsWith("<!--"))
        continue;
      if (currentSection === "summary") {
        report.summary += text + `
`;
      } else if (currentSection === "issues") {
        report.issues += text + `
`;
      } else if (currentSection === "nextSteps") {
        report.nextSteps += text + `
`;
      } else if (currentStage && !inKeyChanges) {
        currentStage.description += text + `
`;
      }
    }
    if (token.type === "list" && currentStage && inKeyChanges) {
      const list = token;
      for (const item of list.items) {
        const text = extractTextFromTokens2(item.tokens);
        if (!text.includes("{description}")) {
          currentStage.keyChanges.push(text.trim());
        }
      }
    }
    if (token.type === "table" && currentSection === "fileReferences") {
      const table = token;
      for (const row of table.rows) {
        const cells = row.map((cell) => extractTextFromTokens2(cell.tokens).trim());
        if (cells.length >= 2 && cells[0] && cells[1]) {
          const path = cells[0].replace(/`/g, "");
          const changes = cells[1];
          if (!path.includes("path/to/file")) {
            report.fileReferences.push({ path, changes });
          }
        }
      }
    }
  }
  if (currentStage) {
    report.accomplishments.push({
      stageNumber: currentStage.stageNumber,
      stageName: currentStage.stageName,
      description: currentStage.description.trim(),
      keyChanges: currentStage.keyChanges
    });
  }
  report.summary = report.summary.trim();
  report.issues = report.issues.trim();
  report.nextSteps = report.nextSteps.trim();
  return report;
}
function validateReport(repoRoot, streamId) {
  const errors = [];
  const warnings = [];
  try {
    const report = parseReport(repoRoot, streamId);
    if (!report.summary || report.summary.length === 0) {
      errors.push("Summary section is empty or missing");
    }
    if (report.accomplishments.length === 0) {
      errors.push("No stage accomplishments found");
    } else {
      for (const accomplishment of report.accomplishments) {
        if (!accomplishment.description || accomplishment.description.length === 0) {
          warnings.push(`Stage ${accomplishment.stageNumber.toString().padStart(2, "0")} (${accomplishment.stageName}) has no description`);
        }
        if (accomplishment.keyChanges.length === 0) {
          warnings.push(`Stage ${accomplishment.stageNumber.toString().padStart(2, "0")} (${accomplishment.stageName}) has no key changes listed`);
        }
      }
    }
    if (report.fileReferences.length === 0) {
      warnings.push("No file references documented");
    }
    if (!report.issues || report.issues.length === 0) {
      warnings.push("Issues & Blockers section is empty");
    }
    if (!report.nextSteps || report.nextSteps.length === 0) {
      warnings.push("Next Steps section is empty");
    }
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  } catch (error) {
    return {
      valid: false,
      errors: [`Failed to parse REPORT.md: ${error instanceof Error ? error.message : String(error)}`],
      warnings
    };
  }
}
function extractTextFromTokens2(tokens) {
  let text = "";
  for (const token of tokens) {
    if (token.type === "paragraph") {
      const para = token;
      text += para.text + " ";
    } else if (token.type === "text") {
      const txt = token;
      text += txt.text + " ";
    } else if (token.type === "strong") {
      const strong = token;
      text += extractTextFromTokens2(strong.tokens) + " ";
    } else if (token.type === "em") {
      const em = token;
      text += extractTextFromTokens2(em.tokens) + " ";
    } else if (token.type === "codespan") {
      const code = token;
      text += code.text + " ";
    }
  }
  return text.trim();
}

// src/cli/complete.ts
function printHelp() {
  console.log(`
work complete - Mark a workstream as complete

Requires: USER role

Usage:
  work complete [--stream <id>] [--no-commit] [--no-pr] [--target <branch>] [--draft] [--force]

Options:
  --stream, -s      Workstream ID or name (uses current if not specified)
  --repo-root, -r   Repository root (auto-detected if omitted)
  --commit          Commit and push changes (default: true)
  --no-commit       Skip committing and pushing changes
  --pr              Create a pull request (default: true)
  --no-pr           Skip creating a pull request
  --target, -t      Target branch for PR (default from config or "main")
  --draft           Create PR as draft
  --force, -f       Bypass REPORT.md validation (not recommended)
  --json            Output result as JSON
  --help, -h        Show this help message

REPORT.md Requirement:
  A valid REPORT.md file is required before completing a workstream.
  The report must have:
    - Summary section with content
    - At least one stage accomplishment
  
  If missing or invalid, run 'work report init' to create the template.
  Use --force to bypass validation (completion will succeed with warning).

Git Operations (when --commit is enabled):
  1. Stages all changes with 'git add -A'
  2. Creates commit: "Completed workstream: {name}"
  3. Pushes to origin/{branch-name}
  4. Shows commit SHA

PR Creation (when --pr is enabled):
  1. Creates PR with title: [{stream-id}] {stream-name}
  2. Body includes summary, PLAN.md link, task counts
  3. Stores PR number in stream metadata

Examples:
  # Mark current workstream complete (with commit/push and PR)
  work complete

  # Mark complete without committing
  work complete --no-commit

  # Mark complete without PR
  work complete --no-pr

  # Create PR targeting develop branch
  work complete --target develop

  # Create a draft PR
  work complete --draft

  # Mark specific workstream complete
  work complete --stream "001-my-stream"

  # Bypass REPORT.md validation (not recommended)
  work complete --force
`);
}
function parseCliArgs(argv) {
  const args = argv.slice(2);
  const parsed = {
    commit: true,
    pr: true,
    draft: false,
    json: false,
    force: false
  };
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
      case "--plan":
      case "-p":
        if (!next) {
          console.error("Error: --stream requires a value");
          return null;
        }
        parsed.streamId = next;
        i++;
        break;
      case "--commit":
        parsed.commit = true;
        break;
      case "--no-commit":
        parsed.commit = false;
        break;
      case "--pr":
        parsed.pr = true;
        break;
      case "--no-pr":
        parsed.pr = false;
        break;
      case "--target":
      case "-t":
        if (!next) {
          console.error("Error: --target requires a value");
          return null;
        }
        parsed.target = next;
        i++;
        break;
      case "--draft":
        parsed.draft = true;
        break;
      case "--json":
        parsed.json = true;
        break;
      case "--force":
      case "-f":
        parsed.force = true;
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
    }
  }
  return parsed;
}
function performGitOperations(repoRoot, streamId, streamName, summary) {
  const result = {
    staged: false,
    committed: false,
    pushed: false,
    alreadyPushed: false
  };
  const branchName = getWorkstreamBranchName(repoRoot, streamId);
  if (!branchName) {
    result.error = "No GitHub branch found for this workstream. Run 'work github create-branch' first.";
    return result;
  }
  try {
    execSync2("git add -A", {
      cwd: repoRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"]
    });
    result.staged = true;
    const statusOutput = execSync2("git status --porcelain", {
      cwd: repoRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"]
    }).trim();
    if (!statusOutput) {
      const unpushed = checkForUnpushedCommits(repoRoot, branchName);
      if (!unpushed) {
        result.alreadyPushed = true;
        result.commitSha = getCurrentCommitSha(repoRoot);
        return result;
      }
    } else {
      const commitMessage = `Completed workstream: ${streamName}`;
      const commitBody = summary ? `
Stream ID: ${streamId}

${summary}` : `
Stream ID: ${streamId}`;
      execSync2(`git commit -m "${commitMessage}" -m "${commitBody.replace(/"/g, "\\\"")}"`, {
        cwd: repoRoot,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"]
      });
      result.committed = true;
    }
    result.commitSha = getCurrentCommitSha(repoRoot);
    try {
      execSync2(`git push origin ${branchName}`, {
        cwd: repoRoot,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"]
      });
      result.pushed = true;
    } catch (pushError) {
      const errorMessage = pushError.message || String(pushError);
      if (errorMessage.includes("Everything up-to-date")) {
        result.alreadyPushed = true;
        result.pushed = true;
      } else {
        result.error = `Push failed: ${errorMessage}`;
      }
    }
    return result;
  } catch (error) {
    const errorMessage = error.message || String(error);
    result.error = errorMessage;
    return result;
  }
}
function checkForUnpushedCommits(repoRoot, branchName) {
  try {
    const result = execSync2(`git log origin/${branchName}..HEAD --oneline`, {
      cwd: repoRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"]
    }).trim();
    return result.length > 0;
  } catch {
    return true;
  }
}
function getCurrentCommitSha(repoRoot) {
  return execSync2("git rev-parse HEAD", {
    cwd: repoRoot,
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"]
  }).trim();
}
function getCurrentBranch(repoRoot) {
  try {
    const result = execSync2("git rev-parse --abbrev-ref HEAD", {
      cwd: repoRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"]
    });
    return result.trim();
  } catch {
    return null;
  }
}
function checkAllStagesApproved(repoRoot, stream, streamId) {
  if (!isApproved(stream)) {
    return { allApproved: false, unapprovedStages: [] };
  }
  const consolidateResult = consolidateStream(repoRoot, streamId, true);
  if (!consolidateResult.success || !consolidateResult.streamDocument) {
    return { allApproved: false, unapprovedStages: [] };
  }
  const stageNumbers = consolidateResult.streamDocument.stages.map((s) => s.id);
  const unapprovedStages = [];
  for (const stageNum of stageNumbers) {
    const stageStatus = getStageApprovalStatus(stream, stageNum);
    if (stageStatus !== "approved") {
      unapprovedStages.push(stageNum);
    }
  }
  return {
    allApproved: unapprovedStages.length === 0,
    unapprovedStages
  };
}
function getTaskSummary(repoRoot, streamId) {
  const tasks = getTasks(repoRoot, streamId);
  return {
    total: tasks.length,
    completed: tasks.filter((t) => t.status === "completed").length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
    pending: tasks.filter((t) => t.status === "pending").length,
    blocked: tasks.filter((t) => t.status === "blocked").length,
    cancelled: tasks.filter((t) => t.status === "cancelled").length
  };
}
function storeCompletionMetadata(repoRoot, streamId) {
  const index = loadIndex(repoRoot);
  const streamIndex = index.streams.findIndex((s) => s.id === streamId || s.name === streamId);
  if (streamIndex === -1) {
    throw new Error(`Workstream "${streamId}" not found`);
  }
  const stream = index.streams[streamIndex];
  stream.github = {
    ...stream.github,
    completed_at: new Date().toISOString()
  };
  stream.updated_at = new Date().toISOString();
  saveIndex(repoRoot, index);
}
function formatPRTitle(streamId, streamName) {
  return `[${streamId}] ${streamName}`;
}
function formatPRBody(repoRoot, streamId, streamName, owner, repo) {
  const taskSummary = getTaskSummary(repoRoot, streamId);
  const planPath = `work/${streamId}/PLAN.md`;
  const lines = [
    `## Summary`,
    ``,
    `Completes workstream: **${streamName}**`,
    ``,
    `## Details`,
    ``,
    `- **Stream ID:** \`${streamId}\``,
    `- **Plan:** [PLAN.md](${planPath})`,
    ``,
    `## Task Completion`,
    ``,
    `| Status | Count |`,
    `|--------|-------|`,
    `| Completed | ${taskSummary.completed} |`,
    `| In Progress | ${taskSummary.inProgress} |`,
    `| Pending | ${taskSummary.pending} |`,
    `| Blocked | ${taskSummary.blocked} |`,
    `| Cancelled | ${taskSummary.cancelled} |`,
    `| **Total** | **${taskSummary.total}** |`,
    ``,
    `---`,
    `*Generated by \`work complete\`*`
  ];
  return lines.join(`
`);
}
async function createWorkstreamPR(repoRoot, streamId, streamName, branchName, targetBranch, draft) {
  try {
    const config = await loadGitHubConfig(repoRoot);
    const token = getGitHubAuth();
    if (!token) {
      return {
        success: false,
        error: "No GitHub authentication found. Set GITHUB_TOKEN/GH_TOKEN or run 'gh auth login'."
      };
    }
    if (!config.owner || !config.repo) {
      return {
        success: false,
        error: "GitHub repository not configured. Run 'work github enable' first."
      };
    }
    const client = createGitHubClient(token, config.owner, config.repo);
    const title = formatPRTitle(streamId, streamName);
    const body = formatPRBody(repoRoot, streamId, streamName, config.owner, config.repo);
    const pr = await client.createPullRequest(title, body, branchName, targetBranch, draft);
    return {
      success: true,
      prNumber: pr.number,
      prUrl: pr.html_url
    };
  } catch (error) {
    const errorMessage = error.message || String(error);
    return {
      success: false,
      error: errorMessage
    };
  }
}
async function validateCompletion(repoRoot, stream, cliArgs) {
  const errors = [];
  const warnings = [];
  let branchName;
  let targetBranch = cliArgs.target || "main";
  const githubEnabled = await isGitHubEnabled(repoRoot);
  if (!githubEnabled) {
    errors.push("GitHub integration is not enabled. Run 'work github enable' first.");
  }
  let branchExists = false;
  if (githubEnabled) {
    const config = await loadGitHubConfig(repoRoot);
    branchName = getWorkstreamBranchName(repoRoot, stream.id) || formatBranchName(config, stream.id);
    branchExists = await workstreamBranchExists(repoRoot, stream.id);
    if (!branchExists) {
      errors.push(`Workstream branch '${branchName}' does not exist. Run 'work github create-branch' first.`);
    }
    if (!cliArgs.target) {
      targetBranch = config.default_pr_target || "main";
    }
  }
  if (githubEnabled && branchExists && branchName) {
    const currentBranch = getCurrentBranch(repoRoot);
    if (currentBranch !== branchName) {
      errors.push(`Not on workstream branch. Current branch: '${currentBranch}', expected: '${branchName}'`);
    }
  }
  const approvalCheck = checkAllStagesApproved(repoRoot, stream, stream.id);
  if (!isApproved(stream)) {
    errors.push("Workstream plan is not approved. Run 'work approve' first.");
  } else if (!approvalCheck.allApproved) {
    for (const stageNum of approvalCheck.unapprovedStages) {
      errors.push(`Stage ${stageNum} is not approved. Run 'work approve stage ${stageNum}' first.`);
    }
  }
  if (!cliArgs.force) {
    const workDir = getWorkDir(repoRoot);
    const reportPath = join8(workDir, stream.id, "REPORT.md");
    if (!existsSync6(reportPath)) {
      errors.push("REPORT.md is missing. Run 'work report init' to create it, or use --force to bypass.");
    } else {
      const reportValidation = validateReport(repoRoot, stream.id);
      if (!reportValidation.valid) {
        errors.push("REPORT.md validation failed:");
        for (const error of reportValidation.errors) {
          errors.push(`  - ${error}`);
        }
        errors.push("Fix the issues above or use --force to bypass.");
      }
      for (const warning of reportValidation.warnings) {
        warnings.push(`REPORT.md: ${warning}`);
      }
    }
  }
  const taskSummary = getTaskSummary(repoRoot, stream.id);
  if (taskSummary.inProgress > 0) {
    warnings.push(`${taskSummary.inProgress} task(s) still in progress`);
  }
  if (taskSummary.pending > 0) {
    warnings.push(`${taskSummary.pending} task(s) still pending`);
  }
  if (taskSummary.blocked > 0) {
    warnings.push(`${taskSummary.blocked} task(s) blocked`);
  }
  return { errors, warnings, branchName, targetBranch };
}
async function main(argv = process.argv) {
  const cliArgs = parseCliArgs(argv);
  if (!cliArgs) {
    console.error(`
Run with --help for usage information.`);
    process.exit(1);
  }
  if (!canExecuteCommand("complete")) {
    console.error(getRoleDenialMessage("complete"));
    process.exit(1);
  }
  let repoRoot;
  try {
    repoRoot = cliArgs.repoRoot ?? getRepoRoot();
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  let resolvedStreamId;
  try {
    const index = loadIndex(repoRoot);
    const stream2 = getResolvedStream(index, cliArgs.streamId);
    resolvedStreamId = stream2.id;
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  const stream = getResolvedStream(loadIndex(repoRoot), resolvedStreamId);
  const validation = await validateCompletion(repoRoot, stream, cliArgs);
  const taskSummary = getTaskSummary(repoRoot, stream.id);
  if (cliArgs.force) {
    const workDir = getWorkDir(repoRoot);
    const reportPath = join8(workDir, stream.id, "REPORT.md");
    if (!existsSync6(reportPath)) {
      validation.warnings.push("WARNING: REPORT.md is missing (bypassed with --force)");
    } else {
      const reportValidation = validateReport(repoRoot, stream.id);
      if (!reportValidation.valid) {
        validation.warnings.push("WARNING: REPORT.md validation failed (bypassed with --force)");
      }
    }
  }
  if (validation.errors.length > 0) {
    if (cliArgs.json) {
      console.log(JSON.stringify({
        success: false,
        errors: validation.errors,
        warnings: validation.warnings,
        stream: stream.id,
        tasks: taskSummary
      }, null, 2));
    } else {
      console.error(`Cannot complete workstream. The following issues must be resolved:
`);
      for (const error of validation.errors) {
        console.error(`  - ${error}`);
      }
      if (validation.warnings.length > 0) {
        console.log(`
Warnings:`);
        for (const warning of validation.warnings) {
          console.log(`  - ${warning}`);
        }
      }
    }
    process.exit(1);
  }
  try {
    storeCompletionMetadata(repoRoot, stream.id);
    const result = completeStream({
      repoRoot,
      streamId: stream.id
    });
    console.log(`Marked workstream "${result.streamId}" as complete`);
    console.log(`   Completed at: ${result.completedAt}`);
    console.log(`   Metrics:      ${result.completionPath}`);
    if (cliArgs.commit) {
      console.log("");
      console.log("Git Operations:");
      const gitResult = performGitOperations(repoRoot, resolvedStreamId, stream.name, `Workstream completed.`);
      if (gitResult.error) {
        console.log(`   Error: ${gitResult.error}`);
      } else {
        if (gitResult.staged) {
          console.log("   Staged all changes");
        }
        if (gitResult.committed) {
          console.log(`   Committed: "Completed workstream: ${stream.name}"`);
        }
        if (gitResult.alreadyPushed && !gitResult.committed) {
          console.log("   No new changes to commit (already up-to-date)");
        }
        if (gitResult.pushed) {
          const branchName = getWorkstreamBranchName(repoRoot, resolvedStreamId);
          if (gitResult.alreadyPushed && gitResult.committed) {
            console.log(`   Pushed to origin/${branchName}`);
          } else if (gitResult.alreadyPushed) {
            console.log(`   Already pushed to origin/${branchName}`);
          } else {
            console.log(`   Pushed to origin/${branchName}`);
          }
        }
        if (gitResult.commitSha) {
          console.log(`   Commit SHA: ${gitResult.commitSha}`);
        }
      }
    }
    if (cliArgs.pr) {
      console.log("");
      console.log("Pull Request:");
      const githubEnabled = await isGitHubEnabled(repoRoot);
      if (!githubEnabled) {
        console.log("   Skipped: GitHub integration is not enabled");
      } else {
        const config = await loadGitHubConfig(repoRoot);
        const branchName = getWorkstreamBranchName(repoRoot, resolvedStreamId) || formatBranchName(config, resolvedStreamId);
        const targetBranch = cliArgs.target || config.default_pr_target || "main";
        const prResult = await createWorkstreamPR(repoRoot, resolvedStreamId, stream.name, branchName, targetBranch, cliArgs.draft);
        if (prResult.error) {
          console.log(`   Error: ${prResult.error}`);
        } else {
          console.log(`   Created PR #${prResult.prNumber}`);
          if (cliArgs.draft) {
            console.log("   Status: Draft");
          }
          console.log(`   Target: ${targetBranch}`);
          console.log(`   URL: ${prResult.prUrl}`);
        }
      }
    }
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }
}
if (__require.main == __require.module) {
  main();
}
export {
  main
};
