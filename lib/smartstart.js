/**
 * Viper SmartStart Node.js Module
 *
 * @author Dale Higgs <@dale3h>
 *
 * @todo Support multiple vehicles
 * @todo Cache session ID and vehicles for quicker commands
 * @todo Figure out why *_status and *_nostatus kick back to auth login loop (related to "Exeption: Invalid Device Command")
 *
 * @ideas
 *   Where is my car?
 *   How fast is my car going?
 *   Start my car
 *   Lock|unlock my car
 *   Open my trunk
 *   Trigger aux [2|3]
 *   How fast did I go today?
 *   Set speed alert for 60mph
 *   Enable|disable lockdown; Turn lockdown on|off; Enable|disable activity alert
 *   Is my car on|running?
 *   What temperature is it inside my car?
 *   Panic
 *   Enable|disable battery alert
 *   Extend the runtime
 */

'use strict';

var debug   = require('debug')('smartstart');
var extend  = require('xtend');
var request = require('request');

// Constants
var DEFAULT_TIMEOUT = 60000;
var DEVICE_COMMAND_TIMEOUT = 60000;
var TWO_MIN_TIMEOUT = 120000;
var THREE_MIN_TIMEOUT = 180000;
var DEVICE_OUTLOOK_TIMEOUT = 60000;
var FIVE_MIN_TIMEOUT = 300000;

var SEND_REQUEST = true;

// New vars
var opts = {};

var defaults = {
  username: null,
  password: null,
  apiUrl: 'https://colt.calamp-ts.com/'
};

function SmartStart(options) {
  if (!(this instanceof SmartStart)) {
    return new SmartStart(options);
  }

  opts = extend(defaults, options);

  this.loginData = null;
  this.sessionId = opts.sessionId || null;
  this.attempts  = 0;
  this.assets    = null;
  this.deviceId  = null;
  this.actions   = null;
}

SmartStart.prototype.set = function(name, value) {
  opts[name] = value;
};

/**
 * New implementations (port of Colt JS)
 */
SmartStart.prototype.get = function(endpoint, args, callback, dataType, timeout) {
  var self = this;

  dataType = dataType || 'json';
  timeout  = timeout || DEFAULT_TIMEOUT;

  if (!this.sessionId) {
    return this.getSessionId({
      username: opts.username,
      password: opts.password
    }, function(err, sessionId) {
      if (err) {
        return callback(err);
      }

      self.get(endpoint, args, callback, dataType, timeout);
    });
  }

  var sessId = '';

  if (this.sessionId && this.sessionId != -1) {
    sessId = '?sessid=' + this.sessionId;
  }

  for (var key in args) {
    if (typeof args[key] == 'string') {
      args[key] = args[key].replace(/[\\\']/g, '');
    }

    args[key] = encodeURIComponent(args[key]);
  }

  var url = opts.apiUrl + endpoint + args.join('/') + sessId;

  debug('url: %s', url);

  if ('undefined' === typeof SEND_REQUEST || SEND_REQUEST) {
    request({url: url, json: 'json' == dataType}, function(err, response, body) {
      if (response.statusCode == 400 && ++self.attempts < 3) {
        self.sessionId = null;

        return self.get(endpoint, args, callback, dataType, timeout);
      }

      self.attempts = 0;

      if (!err && response.statusCode != 200) {
        err = new Error(response.statusCode + ' ' + response.statusMessage);
      }

      if (err) {
        return callback(err);
      }

      return callback(null, body);
    });
  }

  /*
  return $.ajax({
    type: "GET",
    url: ,
    success: function(m) {
      if ($.isFunction(success)) {
        success(m)
      }
    },
    error: function(n, m) {
      if (isEqualIgnoreCase(m, "timeout")) {
        showMessage("Sorry", "The server request timed out.");
        if (isLocate === undefined || !isLocate) {
          return
        }
      }
      if (isEqualIgnoreCase(dataType, "json")) {
        var responseJson = $.parseJSON(n.responseText);
        if (responseJson && responseJson.Return && responseJson.Return.ResponseSummary.StatusCode) {
          var p = responseJson.Return.ResponseSummary.StatusCode;
          var r = !isEmpty(responseJson.Return.Results) ? responseJson.Return.Results : "";
          switch (p) {
            case 4:
              if ($.isFunction(error)) {
                error(responseJson)
              } else {
                showMessage("Error", responseJson.Return.ResponseSummary.ErrorMessage)
              }
              return;
              break;
            case 5:
              window.location.href = opts.apiUrl + dashboard_id + "/login?timeout";
              return;
              break;
            case 6:
              showMessage("", "You do not have access to this resource. Please contact your account administrator.");
              return;
              break;
            case 20:
              window.location.href = opts.apiUrl + dashboard_id + "/login?timeout";
              return;
              break;
            case 29:
              showMessage("", "Please enter a valid email for " + r);
              return;
              break;
            case 31:
              showMessage("", "Please enter a valid number " + r);
              return;
              break;
            case 42:
              showMessage("", "Please enter only letters for " + r);
              return;
              break;
            case 43:
              showMessage("", "Please enter only letters or numbers for " + r);
              return;
              break;
            case 44:
              showMessage("", "Please enter letters, numbers or special characters for " + r + ". The following special characters are supported: !, @, #, $, %, ^, *, (, ), _, -, +, /, :, ,, ., ?, <, >");
              return;
              break;
            case 45:
              showMessage("", "Please select a valid date for " + r);
              return;
              break;
            case 46:
              showMessage("", "Please enter a valid number for " + r);
              return;
              break;
            case 48:
              showMessage("", "Please enter valid html for " + r);
              return;
              break;
            default:
              if ($.isFunction(error)) {
                error(responseJson)
              }
              break
          }
        } else {
          if ($.isFunction(error)) {
            error(n)
          }
        }
      } else {
        if ($.isFunction(error)) {
          error(n)
        }
      }
    },
    timeout: timeout,
    dataType: dataType
  })
  */
};

SmartStart.prototype.getSessionId = function(credentials, callback) {
  var self = this;

  if (this.sessionId) {
    return callback(null, this.sessionId);
  }

  if (!credentials.username) {
    return callback(new Error('Missing parameter \'username\''));
  }

  if (!credentials.password) {
    return callback(new Error('Missing parameter \'password\''));
  }

  this.sessionId = -1;

  this.get('auth/login/', [credentials.username.toString(), credentials.password.toString()], function(err, data) {
    if (err) {
      return callback(err);
    }

    self.loginData = data;
    self.sessionId = data.Return.Results.SessionID;

    return callback(null, self.sessionId);
  });
};

SmartStart.prototype.getAssets = function(callback) {
  var self = this;

  if (this.assets) {
    return callback(null, this.assets);
  }

  self.get('device/AdvancedSearch/', [], function(err, data) {
    if (err) {
      return callback(err);
    }

    self.assets = data.Return.Results.Devices;

    return callback(null, self.assets);
  });
};

SmartStart.prototype.getDeviceId = function(deviceIndex, callback) {
  var self = this;

  if (typeof deviceIndex == 'function') {
    callback = deviceIndex;
    deviceIndex = 0;
  }

  if (this.deviceId) {
    return callback(null, this.deviceId);
  }

  if (deviceIndex === undefined) {
    deviceIndex = 0;
  }

  this.getAssets(function(err, assets) {
    if (err) {
      return callback(err);
    }

    self.deviceId = assets[deviceIndex].DeviceId;

    return callback(null, self.deviceId);
  });
};

SmartStart.prototype.getDeviceIdByName = function(deviceName, callback) {
  var self = this;

  if (typeof deviceName == 'function') {
    callback = deviceName;
    deviceName = 0;
  }

  if (this.deviceId) {
    return callback(null, this.deviceId);
  }

  if (deviceName === undefined) {
    deviceName = 0;
  }

  this.getAssets(function(err, assets) {
    if (err) {
      return callback(err);
    }

    debug(assets);

    var deviceId = null;

    for (var i = 0; i < assets.length; i++) {
      var asset = assets[i];

      debug('asset.Name = "%s"', asset.Name.toLowerCase());
      debug('deviceName = "%s"', deviceName.toLowerCase());

      // Direct identical comparison (lowercase)
      if (asset.Name.toLowerCase().localeCompare(deviceName.toLowerCase()) === 0) {
        debug('deviceId found with localeCompare');
        deviceId = asset.DeviceId;
        break;
      }

      // Contains comparison (lowercase)
      if (asset.Name.toLowerCase().indexOf(deviceName.toLowerCase()) !== -1) {
        debug('deviceId found with indexOf');
        deviceId = asset.DeviceId;
        break;
      }
    }

    debug('deviceId: %d', deviceId);

    self.deviceId = deviceId;

    return callback(null, self.deviceId);
  });
};

SmartStart.prototype.getDevice = function(deviceIndex, callback) {
  var self = this;

  if (typeof deviceIndex == 'function') {
    callback = deviceIndex;
    deviceIndex = 0;
  }

  if (this.assets && this.assets[deviceIndex]) {
    return callback(null, this.assets[deviceIndex]);
  }

  if (deviceIndex === undefined) {
    deviceIndex = 0;
  }

  this.getAssets(function(err, assets) {
    if (!err && !assets[deviceIndex]) {
      err = new Error('Invalid device index "' + deviceIndex + '"');
    }

    if (err) {
      return callback(err);
    }

    return callback(null, assets[deviceIndex]);
  });
};

SmartStart.prototype.getActions = function(deviceIndex, callback) {
  var self = this;

  if (typeof deviceIndex == 'function') {
    callback = deviceIndex;
    deviceIndex = 0;
  }

  if (this.actions === null) {
    this.actions = {};
  }

  if (this.actions && this.actions[deviceIndex]) {
    return callback(null, this.actions[deviceIndex]);
  }

  if (deviceIndex === undefined) {
    deviceIndex = 0;
  }

  this.getDevice(deviceIndex, function(err, device) {
    var actions = [];

    for (var i = 0; i < device.AvailActions.length; i++) {
      actions.push(device.AvailActions[i].Name.toLowerCase());
    }

    self.actions[deviceIndex] = actions.filter(function(elem, pos) {
      debug('_status:', elem.indexOf('_status'));
      debug('_nostatus', elem.indexOf('_nostatus'));

      if (elem.indexOf('_status') != -1 || elem.indexOf('_nostatus') != -1) {
        return false;
      }

      return actions.indexOf(elem) == pos;
    });

    self.actions[deviceIndex].sort();

    return callback(null, self.actions[deviceIndex]);
  });
};

SmartStart.prototype.sendAction = function(deviceId, command, arg1, arg2, callback) {
  var self = this;

  if (typeof arg1 == 'function') {
    callback = arg1;
    arg1     = null;
    arg2     = 0;
  }

  if (!deviceId) {
    return this.getDeviceId(function(err, autoDeviceId) {
      if (err) {
        return callback(err);
      }

      return self.sendAction(autoDeviceId, command, arg1, arg2, callback);
    });
  }

  return this.get('device/SendCommand/', [deviceId, command, arg1, arg2], callback);
};

/////////////////////////////////////////////

/*
SmartStart.prototype.sendActionCommand = function(deviceId, domObj, command) {
  if (command == 'enable_location_validation_report' && curr_account.EnableLocationValidationReport == '0') {
    showMessage('Error', 'The Location Validation Report is not enabled for this account')
  } else {
    var a = null;

    switch (command) {
      case 'emergency_tracking':
        emergencyTracking(deviceId, domObj);
        return;

      case 'enable_movement_alert':
      case 'disable_movement_alert':
      case 'set_geozone':
      case 'enable_quartermile_fence':
      case 'disable_quartermile_fence':
        geoFence(deviceId, domObj);
        return;

      case 'set_speed_alert':
        speedAlert(deviceId, domObj);
        return;

      case 'set_accelerometer_alert':
        accelerometerAlert(deviceId, domObj);
        return;

      case 'locate':
        cleanupMap();
        break;

      case 'enable_zone1_entry_alert':
      case 'disable_zone1_entry_alert':
      case 'enable_zone1_exit_alert':
      case 'disable_zone1_exit_alert':
        a = 1;
        break;
    }

    removeMapPopupActions();
    device_id = getDevicesIds(deviceId);
    GetRemainingActions(device_id, command, get_remaining_actions_handler(deviceId, domObj, command, a))
  }
}

SmartStart.getAssetDetail = function(assetId, f, c, g, b) {
  get('device/GetAssetDetail/', [assetId, f, c], g, b, 'json', THREE_MIN_TIMEOUT)
}
*/

/**
 * Implemented commands
 */
SmartStart.prototype.remote = function(deviceId, callback) {
  if (typeof deviceId == 'function') {
    callback = deviceId;
    deviceId = null;
  }

  this.sendAction(deviceId, 'remote', callback);
};

SmartStart.prototype.start = function(deviceId, callback) {
  return this.remote(deviceId, callback);
};

SmartStart.prototype.stop = function(deviceId, callback) {
  return this.remote(deviceId, callback);
};

SmartStart.prototype.arm = function(deviceId, callback) {
  if (typeof deviceId == 'function') {
    callback = deviceId;
    deviceId = null;
  }

  this.sendAction(deviceId, 'arm', callback);
};

SmartStart.prototype.disarm = function(deviceId, callback) {
  if (typeof deviceId == 'function') {
    callback = deviceId;
    deviceId = null;
  }

  this.sendAction(deviceId, 'disarm', callback);
};

SmartStart.prototype.panic = function(deviceId, callback) {
  if (typeof deviceId == 'function') {
    callback = deviceId;
    deviceId = null;
  }

  this.sendAction(deviceId, 'panic', callback);
};

SmartStart.prototype.trunk = function(deviceId, callback) {
  if (typeof deviceId == 'function') {
    callback = deviceId;
    deviceId = null;
  }

  this.sendAction(deviceId, 'trunk', callback);
};

SmartStart.prototype.aux2 = function(deviceId, callback) {
  if (typeof deviceId == 'function') {
    callback = deviceId;
    deviceId = null;
  }

  this.sendAction(deviceId, 'aux2', callback);
};

SmartStart.prototype.aux3 = function(deviceId, callback) {
  if (typeof deviceId == 'function') {
    callback = deviceId;
    deviceId = null;
  }

  this.sendAction(deviceId, 'aux3', callback);
};

SmartStart.prototype.status = function(deviceId, callback) {
  if (typeof deviceId == 'function') {
    callback = deviceId;
    deviceId = null;
  }

  this.sendAction(deviceId, 'read_current', callback);
};

SmartStart.prototype.topSpeed = function(deviceId, callback) {
  if (typeof deviceId == 'function') {
    callback = deviceId;
    deviceId = null;
  }

  this.sendAction(deviceId, 'fastest_speed', callback);
};

SmartStart.prototype.locate = function(deviceId, callback) {
  if (typeof deviceId == 'function') {
    callback = deviceId;
    deviceId = null;
  }

  this.sendAction(deviceId, 'locate', callback);
};

module.exports = SmartStart;

/**
 * List of actions supported on my car
 *
 * AL_ALERT_CLEAR
 * ~~AL_QUERY~~
 * **ARM**
 * ~~ARM_NOSTATUS~~
 * ~~ARM_STATUS~~
 * CANCEL_RETRIES
 * DIRECT_IO_LOCK_3500
 * DIRECT_IO_LOCK_3500_2PULSE
 * DIRECT_IO_LOCK_400
 * DIRECT_IO_LOCK_400_2PULSE
 * DIRECT_IO_LOCK_750
 * DIRECT_IO_LOCK_750_2PULSE
 * DIRECT_IO_REMOTE_750
 * DIRECT_IO_TRUNK_750
 * DIRECT_IO_TRUNK_750_WITH_UNLOCK
 * DIRECT_IO_UNLOCK_3500
 * DIRECT_IO_UNLOCK_3500_2PULSE
 * DIRECT_IO_UNLOCK_400
 * DIRECT_IO_UNLOCK_400_2PULSE
 * DIRECT_IO_UNLOCK_750
 * DIRECT_IO_UNLOCK_750_2PULSE
 * DISABLE_BATTERY_ALERT
 * DISABLE_MOVEMENT_ALERT
 * DISABLE_ZONE1_ENTRY_ALERT
 * DISABLE_ZONE1_EXIT_ALERT
 * DISABLE_ZONE2_ENTRY_ALERT
 * DISABLE_ZONE2_EXIT_ALERT
 * DISABLE_ZONE3_ENTRY_ALERT
 * DISABLE_ZONE3_EXIT_ALERT
 * **DISARM**
 * ~~DISARM_NOSTATUS~~
 * ~~DISARM_STATUS~~
 * ENABLE_BATTERY_ALERT
 * ENABLE_MOVEMENT_ALERT
 * ENABLE_ZONE1_ENTRY_ALERT
 * ENABLE_ZONE1_EXIT_ALERT
 * ENABLE_ZONE2_ENTRY_ALERT
 * ENABLE_ZONE2_EXIT_ALERT
 * ENABLE_ZONE3_ENTRY_ALERT
 * ENABLE_ZONE3_EXIT_ALERT
 * **FASTEST_SPEED**
 * FN_AUX1_REM2_ON
 * FN_AUX1_REM3_ON
 * FN_AUX2_REM2_ON
 * FN_AUX2_REM3_ON
 * FN_EXTEND_RUNTIME
 * FN_LOCK_REM2_ON_NOSTATUS
 * FN_LOCK_REM2_ON_STATUS
 * FN_LOCK_REM3_ON_NOSTATUS
 * FN_LOCK_REM3_ON_STATUS
 * FN_PANIC_REM1_OFF_NOSTATUS
 * FN_PANIC_REM1_OFF_STATUS
 * FN_PANIC_REM2_OFF_NOSTATUS
 * FN_PANIC_REM2_OFF_STATUS
 * FN_PANIC_REM2_ON_NOSTATUS
 * FN_PANIC_REM2_ON_STATUS
 * FN_PANIC_REM3_OFF_NOSTATUS
 * FN_PANIC_REM3_OFF_STATUS
 * FN_PANIC_REM3_ON_NOSTATUS
 * FN_PANIC_REM3_ON_STATUS
 * FN_START_REM_STATUS
 * FN_START_STOP_REM
 * FN_STOP_REM_STATUS
 * FN_TRUNK_REM2_ON_NOSTATUS
 * FN_TRUNK_REM2_ON_STATUS
 * FN_TRUNK_REM3_ON_NOSTATUS
 * FN_UNLOCK_ALL_REM2_ON_NOSTATUS
 * FN_UNLOCK_ALL_REM2_ON_STATUS
 * FN_UNLOCK_ALL_REM3_ON_NOSTATUS
 * FN_UNLOCK_ALL_REM3_ON_STATUS
 * FORCE_ID_REPORT
 * GEOZONE_GROUP_1
 * GEOZONE_GROUP_2
 * **LOCATE**
 * **PANIC**
 * ~~PANIC_NOSTATUS~~
 * ~~PANIC_STATUS~~
 * **READ_ACTIVE**
 * **READ_CURRENT**
 * **REMOTE**
 * ~~REMOTE_NOSTATUS~~
 * ~~REMOTE_STATUS~~
 * REQ_BAT_VOLT
 * REQ_CLR_DTC
 * REQ_DTC
 * REQ_DTC_CODE
 * REQ_ENG_TEMP
 * REQ_EXTENDED_STATUS
 * REQ_EXTENDED_STATUS_SUPPORT
 * REQ_FUEL_LEVEL
 * REQ_INT_TEMP
 * REQ_MODULE_INFO_1
 * REQ_MODULE_INFO_2
 * REQ_MODULE_INFO_3
 * REQ_MODULE_INFO_4
 * REQ_ODO
 * REQ_PROTOCOL_VER
 * REQ_RPM
 * REQ_RUNTIME
 * REQ_SPEED
 * REQ_TPMS
 * REQ_VIN_1
 * REQ_VIN_2
 * REQ_VIN_3
 * REQ_VIN_4
 * REQ_VIN_5
 * REQ_VIN_6
 * SET_GEOZONE
 * SET_GEOZONE1_CIRCLE
 * SET_GEOZONE2_CIRCLE
 * SET_GEOZONE3_CIRCLE
 * SET_GEOZONE_RECT
 * SET_SPEED_ALERT
 * **TRUNK**
 * ~~TRUNK_NOSTATUS~~
 * ~~TRUNK_STATUS~~
 */
