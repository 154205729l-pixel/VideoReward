/*
 * UnifiedRewardSDK
 *
 * One SDK for both iOS and Android WebView rewarded video flow.
 * - iOS   -> dongdianqiu (Taku style adRequest params)
 * - Android -> dongqiudi (ToBid style adRequest params)
 */
(function (root) {
  'use strict';

  // 业务只需要改这里：统一内置配置（不再需要额外 params 文件）
  var EMBEDDED_CONFIG = {
    platform: 'auto', // auto | ios | android
    sceneId: 'leagueCollect_14',
    adRequest: {
      ios: {
        method: 'get',
        urlMap: {
          'test1-n.dongdianqiu.com': 'https://test-ap.dongdianqiu.com/plat/v3',
          'beta-n.dongdianqiu.com': 'https://beta-ap.dongdianqiu.com/plat/v3',
          'n.dongdianqiu.com': 'https://ap.dongdianqiu.com/plat/v3'
        },
        fallbackUrl: 'https://ap.dongdianqiu.com/plat/v3',
        param: {
          apname: 'DProApp',
          apvc: '8.5.2',
          os: 'ios',
          platform: '1',
          position: '0',
          pgid: '1.15.2'
        }
      },
      android: {
        method: 'get',
        urlMap: {
          'test1-n.dongqiudi.com': 'https://test-ap.dongqiudi.com/plat/v3',
          'beta-n.dongqiudi.com': 'https://beta-ap.dongqiudi.com/plat/v3',
          'n.dongqiudi.com': 'https://ap.dongqiudi.com/plat/v3',
          '10.18.7.0': 'https://beta-ap.dongqiudi.com/plat/v3'
        },
        fallbackUrl: 'https://ap.dongqiudi.com/plat/v3',
        param: {
          pgid: '1.15.2'
        }
      }
    },
    reward: {
      reward_name: 'coin',
      reward_amount: '1',
      data: '',
      pgid: '1.15.2'
    },
    behavior: {
      callbackTimeout: 8000,
      bridgeDetectTimeout: 5000
    }
  };

  var DEFAULTS = null;

  function extend(target) {
    var i;
    var key;
    var source;
    target = target || {};
    for (i = 1; i < arguments.length; i += 1) {
      source = arguments[i] || {};
      for (key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }
    return target;
  }

  function clone(value) {
    if (!value || typeof value !== 'object') return value;
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeConfig(config) {
    var input = config || {};
    var merged = clone(EMBEDDED_CONFIG);

    if (typeof input.platform === 'string' && input.platform) {
      merged.platform = input.platform;
    }
    if (typeof input.sceneId === 'string' && input.sceneId) {
      merged.sceneId = input.sceneId;
    }
    if (input.reward) {
      merged.reward = extend({}, merged.reward, input.reward);
    }
    if (input.behavior) {
      merged.behavior = extend({}, merged.behavior, input.behavior);
    }
    if (input.adRequest && input.adRequest.ios) {
      merged.adRequest.ios = extend({}, merged.adRequest.ios, input.adRequest.ios);
      merged.adRequest.ios.param = extend({}, EMBEDDED_CONFIG.adRequest.ios.param, input.adRequest.ios.param || {});
      merged.adRequest.ios.urlMap = extend({}, EMBEDDED_CONFIG.adRequest.ios.urlMap, input.adRequest.ios.urlMap || {});
    }
    if (input.adRequest && input.adRequest.android) {
      merged.adRequest.android = extend({}, merged.adRequest.android, input.adRequest.android);
      merged.adRequest.android.param = extend({}, EMBEDDED_CONFIG.adRequest.android.param, input.adRequest.android.param || {});
      merged.adRequest.android.urlMap = extend({}, EMBEDDED_CONFIG.adRequest.android.urlMap, input.adRequest.android.urlMap || {});
    }

    return merged;
  }

  function buildDefaultsFromConfig(config) {
    var normalized = normalizeConfig(config);
    return {
      platform: normalized.platform || 'auto',
      bridgeDetectTimeout: Number(normalized.behavior && normalized.behavior.bridgeDetectTimeout) || 5000,
      callbackTimeout: Number(normalized.behavior && normalized.behavior.callbackTimeout) || 8000,
      sceneId: normalized.sceneId || 'leagueCollect_14',
      adRequest: {
        ios: clone(normalized.adRequest.ios),
        android: clone(normalized.adRequest.android)
      },
      reward: clone(normalized.reward),
      onLog: null
    };
  }

  if (!root.__UNIFIED_REWARD_CONFIG) {
    root.__UNIFIED_REWARD_CONFIG = clone(EMBEDDED_CONFIG);
  }
  DEFAULTS = buildDefaultsFromConfig(root.__UNIFIED_REWARD_CONFIG);

  function isFunction(fn) {
    return typeof fn === 'function';
  }

  function safeJsonParse(value) {
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value);
    } catch (e) {
      return value;
    }
  }

  function normalizeOrigin(origin) {
    var normalized = (origin || 'topon').toString().trim().toLowerCase();
    if (normalized === 'csj') normalized = 'jrtt';
    if (['topon', 'gdt', 'jrtt', 'dqd', 'tobid'].indexOf(normalized) < 0) {
      normalized = 'topon';
    }
    return normalized;
  }

  function unwrapResponse(response) {
    var wrapped = response && response._responseWrapedByNative ? response._responseWrapedByNative : response;
    return safeJsonParse(wrapped);
  }

  function findRewardedAdItem(body) {
    var list = body && body.data;
    var i;

    if (Object.prototype.toString.call(list) !== '[object Array]') {
      return null;
    }

    for (i = 0; i < list.length; i += 1) {
      if (list[i] && list[i].ad_type === 'sdk_rewarded_video') {
        return list[i];
      }
    }

    return null;
  }

  function ensureBridgeConnector() {
    if (root.connectWebViewJavascriptBridge) return;

    root.connectWebViewJavascriptBridge = function (callback) {
      var iframe;

      if (root.WebViewJavascriptBridge) {
        if (!root.WebViewJavascriptBridge._messageHandler && root.WebViewJavascriptBridge.init) {
          root.WebViewJavascriptBridge.init(function () {});
        }
        callback(root.WebViewJavascriptBridge);
        return;
      }

      if (root.$bridge && root.$bridge.callHandler) {
        callback(root.$bridge);
        return;
      }

      document.addEventListener('WebViewJavascriptBridgeReady', function () {
        if (root.WebViewJavascriptBridge && !root.WebViewJavascriptBridge._messageHandler && root.WebViewJavascriptBridge.init) {
          root.WebViewJavascriptBridge.init(function () {});
        }
        callback(root.WebViewJavascriptBridge || root.$bridge || null);
      }, false);

      if (root.WVJBCallbacks) {
        root.WVJBCallbacks.push(callback);
        return;
      }

      root.WVJBCallbacks = [callback];
      iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = 'https://__bridge_loaded__';
      document.documentElement.appendChild(iframe);
      setTimeout(function () {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 0);
    };
  }

  function detectPlatformByUA() {
    var ua = (root.navigator && root.navigator.userAgent ? root.navigator.userAgent : '').toLowerCase();
    if (/android/.test(ua)) return 'android';
    if (/iphone|ipad|ipod|ios/.test(ua)) return 'ios';
    return 'android';
  }

  function UnifiedRewardBridge(options, baseDefaults) {
    var opts = options || {};
    var defaults = baseDefaults || DEFAULTS;
    this.options = extend({}, defaults, opts);
    this.options.adRequest = {
      ios: extend({}, clone(defaults.adRequest.ios), clone(opts.adRequest && opts.adRequest.ios || {})),
      android: extend({}, clone(defaults.adRequest.android), clone(opts.adRequest && opts.adRequest.android || {}))
    };
    this.options.reward = extend({}, clone(defaults.reward), clone(opts.reward || {}));
    this.currentPayload = null;
    this.currentPlatform = null;
    this._disconnectRegistered = false;
    this._disconnectListeners = [];
  }

  UnifiedRewardBridge.prototype.log = function (title, data) {
    if (isFunction(this.options.onLog)) {
      this.options.onLog(title, data);
    }
    if (root.console && root.console.log) {
      root.console.log('[UnifiedRewardSDK] ' + title, data || '');
    }
  };

  UnifiedRewardBridge.prototype.getPlatform = function (overridePlatform) {
    var platform = overridePlatform || this.options.platform || 'auto';
    if (platform === 'ios' || platform === 'android') {
      return platform;
    }
    return detectPlatformByUA();
  };

  UnifiedRewardBridge.prototype.getBridge = function (callback) {
    var done = false;
    var timeout;

    ensureBridgeConnector();

    timeout = setTimeout(function () {
      if (done) return;
      done = true;
      callback(new Error('未检测到可用的 WebView bridge'));
    }, this.options.bridgeDetectTimeout);

    root.connectWebViewJavascriptBridge(function (bridge) {
      if (done) return;
      done = true;
      clearTimeout(timeout);

      if (bridge && bridge.callHandler) {
        callback(null, bridge);
        return;
      }

      callback(new Error('bridge 已就绪，但没有 callHandler'));
    });
  };

  UnifiedRewardBridge.prototype.callHandler = function (name, data, callback) {
    var self = this;
    var cb = isFunction(callback) ? callback : function () {};

    this.log('call ' + name, data);

    this.getBridge(function (bridgeErr, bridge) {
      var done = false;
      var timer;

      if (bridgeErr) {
        cb(bridgeErr);
        return;
      }

      timer = setTimeout(function () {
        if (done) return;
        done = true;
        cb(null, null, { timeout: true });
      }, self.options.callbackTimeout);

      try {
        bridge.callHandler(name, data || {}, function (response) {
          if (done) return;
          done = true;
          clearTimeout(timer);
          self.log(name + ' callback', response);
          cb(null, response, { timeout: false });
        });
      } catch (error) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        cb(error);
      }
    });
  };

  UnifiedRewardBridge.prototype.detectBridge = function (callback) {
    this.getBridge(function (error) {
      if (isFunction(callback)) callback(error || null);
    });
  };

  UnifiedRewardBridge.prototype.resolveAdRequest = function (platform, options) {
    var cfg = this.options.adRequest[platform] || {};
    var reqOpts = options && options.adRequest ? options.adRequest : {};
    var hostname = root.location && root.location.hostname ? root.location.hostname : '';
    var finalParam = extend({}, cfg.param || {}, reqOpts.param || {});
    var finalUrl = reqOpts.url || (cfg.urlMap && cfg.urlMap[hostname]) || cfg.fallbackUrl;
    var pgid = (options && options.reward && options.reward.pgid) || this.options.reward.pgid || finalParam.pgid || '1.15.2';

    finalParam.pgid = pgid;

    if (platform === 'ios') {
      finalParam.os = 'ios';
      if (!finalParam.platform) finalParam.platform = '1';
      if (!finalParam.position) finalParam.position = '0';
    }

    return {
      method: (reqOpts.method || cfg.method || 'get').toLowerCase(),
      url: finalUrl,
      param: finalParam,
      callback: reqOpts.callback || 'onUnifiedAdRequestDone'
    };
  };

  UnifiedRewardBridge.prototype.buildPayloadFromAd = function (platform, adItem, options, adRequest) {
    var rewardCfg = extend({}, this.options.reward, options && options.reward || {});
    var adSource = adItem && adItem.ad_source ? adItem.ad_source : {};
    var sdkId = adSource.sdk_position_id || adItem.sdk_id || rewardCfg.sdk_id || rewardCfg.sdkId;
    var origin = normalizeOrigin(adItem.origin || adSource.sdk_origin || adSource.sdk_name || rewardCfg.origin || (platform === 'android' ? 'tobid' : 'topon'));
    var sceneId = (options && options.sceneId) || rewardCfg.id || rewardCfg.relate_id || this.options.sceneId;
    var pgid = rewardCfg.pgid || adItem.pgid || (adRequest && adRequest.param && adRequest.param.pgid) || '1.15.2';

    if (!sdkId) {
      throw new Error('广告配置缺少 sdk_id(ad_source.sdk_position_id)');
    }

    if (platform === 'ios') {
      return {
        id: sceneId,
        relate_id: sceneId,
        sdk_id: sdkId,
        sdkId: sdkId,
        origin: origin,
        platform: origin,
        reward_name: rewardCfg.reward_name || '',
        reward_amount: rewardCfg.reward_amount || '',
        data: typeof rewardCfg.data === 'undefined' ? '' : rewardCfg.data,
        imp_mon_arr: Array.isArray(adItem.imp_mon_arr) ? adItem.imp_mon_arr : [],
        click_mon_arr: Array.isArray(adItem.click_mon_arr) ? adItem.click_mon_arr : [],
        pgid: pgid
      };
    }

    return {
      origin: origin,
      sdk_id: sdkId,
      sdkId: sdkId,
      imp_mon_arr: Array.isArray(adItem.imp_mon_arr) ? adItem.imp_mon_arr : [],
      click_mon_arr: Array.isArray(adItem.click_mon_arr) ? adItem.click_mon_arr : [],
      ct: '',
      pgid: pgid
    };
  };

  UnifiedRewardBridge.prototype.setPayload = function (payload) {
    this.currentPayload = extend({}, payload || {});
    return this.currentPayload;
  };

  UnifiedRewardBridge.prototype.getPayload = function () {
    return this.currentPayload;
  };

  UnifiedRewardBridge.prototype.requestAd = function (options, callback) {
    var self = this;
    var cb = callback;
    var opts = options || {};
    var platform;
    var requestData;

    if (isFunction(options)) {
      cb = options;
      opts = {};
    }

    platform = this.getPlatform(opts.platform);
    this.currentPlatform = platform;
    requestData = this.resolveAdRequest(platform, opts);

    this.callHandler('adRequest', requestData, function (err, response, meta) {
      var body;
      var adItem;
      var payload;

      if (err) {
        if (isFunction(cb)) cb(err);
        return;
      }
      if (meta && meta.timeout) {
        if (isFunction(cb)) cb(new Error('adRequest 回调超时'));
        return;
      }

      body = unwrapResponse(response);
      self.log('adRequest body', body);

      if (!body || typeof body !== 'object') {
        if (isFunction(cb)) cb(new Error('adRequest 返回体为空或格式错误'));
        return;
      }

      if (typeof body.code !== 'undefined' && Number(body.code) !== 0) {
        if (isFunction(cb)) cb(new Error('adRequest code=' + body.code));
        return;
      }

      adItem = findRewardedAdItem(body);
      if (!adItem) {
        if (isFunction(cb)) cb(new Error('adRequest 未返回 sdk_rewarded_video 广告位'));
        return;
      }

      try {
        payload = self.buildPayloadFromAd(platform, adItem, opts, requestData);
      } catch (buildErr) {
        if (isFunction(cb)) cb(buildErr);
        return;
      }

      self.setPayload(payload);
      if (isFunction(cb)) cb(null, payload, {
        platform: platform,
        adRequestResponse: response,
        adRequestBody: body,
        adRequestData: requestData
      });
    });
  };

  UnifiedRewardBridge.prototype.preload = function (payloadOrOptions, callback) {
    var cb = callback;
    var payload = payloadOrOptions;

    if (isFunction(payloadOrOptions)) {
      cb = payloadOrOptions;
      payload = null;
    }

    if (!payload) {
      payload = this.currentPayload;
    }

    if (!payload) {
      if (isFunction(cb)) cb(new Error('缺少可用 payload，请先 requestAd')); 
      return;
    }

    this.setPayload(payload);
    this.callHandler('preLoadVideo', payload, cb);
  };

  UnifiedRewardBridge.prototype.buildShowPayload = function (payload, options) {
    var platform = this.getPlatform(options && options.platform || this.currentPlatform);
    var sceneId = (options && options.sceneId) || this.options.sceneId;

    if (platform === 'ios') {
      return extend({}, payload, {
        id: payload.id || sceneId,
        relate_id: payload.relate_id || payload.id || sceneId
      });
    }

    return extend({
      id: sceneId,
      data: {}
    }, payload);
  };

  UnifiedRewardBridge.prototype.show = function (payloadOrOptions, callback) {
    var cb = callback;
    var payload = payloadOrOptions;

    if (isFunction(payloadOrOptions)) {
      cb = payloadOrOptions;
      payload = null;
    }

    if (!payload || (payload && !payload.sdk_id && !payload.sdkId)) {
      payload = this.currentPayload;
    }

    if (!payload) {
      if (isFunction(cb)) cb(new Error('缺少可用 payload，请先 requestAd/preload')); 
      return;
    }

    payload = this.buildShowPayload(payload, {});
    this.setPayload(payload);
    this.callHandler('connectVideo', payload, cb);
  };

  UnifiedRewardBridge.prototype.requestAndPreload = function (options, callback) {
    var self = this;
    var cb = callback;
    var opts = options || {};

    if (isFunction(options)) {
      cb = options;
      opts = {};
    }

    this.requestAd(opts, function (err, payload, detail) {
      if (err) {
        if (isFunction(cb)) cb(err);
        return;
      }

      self.preload(payload, function (preErr, preResp, preMeta) {
        if (isFunction(cb)) {
          cb(preErr || null, payload, {
            platform: detail.platform,
            adRequest: detail,
            preloadResponse: preResp,
            preloadMeta: preMeta
          });
        }
      });
    });
  };

  UnifiedRewardBridge.prototype.requestPreloadAndShow = function (options, callback) {
    var self = this;
    var cb = callback;
    var opts = options || {};

    if (isFunction(options)) {
      cb = options;
      opts = {};
    }

    this.requestAndPreload(opts, function (err, payload, detail) {
      if (err) {
        if (isFunction(cb)) cb(err);
        return;
      }

      self.show(payload, function (showErr, showResp, showMeta) {
        if (isFunction(cb)) {
          cb(showErr || null, {
            platform: detail.platform,
            payload: payload,
            adRequest: detail.adRequest,
            preloadResponse: detail.preloadResponse,
            preloadMeta: detail.preloadMeta,
            showResponse: showResp,
            showMeta: showMeta
          });
        }
      });
    });
  };

  UnifiedRewardBridge.prototype.onDisconnectVideo = function (listener, callback) {
    var self = this;

    if (isFunction(listener)) {
      this._disconnectListeners.push(listener);
    }

    if (this._disconnectRegistered) {
      if (isFunction(callback)) callback(null);
      return;
    }

    this.getBridge(function (error, bridge) {
      if (error) {
        if (isFunction(callback)) callback(error);
        return;
      }

      if (!bridge.registerHandler) {
        if (isFunction(callback)) callback(new Error('bridge 不支持 registerHandler，无法监听 disConnectVideo'));
        return;
      }

      bridge.registerHandler('disConnectVideo', function (cbData, responseCallback) {
        var i;
        self.log('receive disConnectVideo', cbData);

        for (i = 0; i < self._disconnectListeners.length; i += 1) {
          try {
            self._disconnectListeners[i](cbData || {});
          } catch (listenerError) {
            self.log('disConnectVideo listener error', { message: listenerError.message });
          }
        }

        if (isFunction(responseCallback)) {
          responseCallback({ ok: true });
        }
      });

      self._disconnectRegistered = true;
      if (isFunction(callback)) callback(null);
    });
  };

  root.UnifiedRewardSDK = {
    create: function (options) {
      var runtimeConfig = normalizeConfig(root.__UNIFIED_REWARD_CONFIG || EMBEDDED_CONFIG);
      var runtimeDefaults = buildDefaultsFromConfig(runtimeConfig);
      return new UnifiedRewardBridge(options, runtimeDefaults);
    },
    Constructor: UnifiedRewardBridge,
    utils: {
      detectPlatformByUA: detectPlatformByUA,
      normalizeOrigin: normalizeOrigin,
      getEmbeddedConfig: function () {
        return clone(EMBEDDED_CONFIG);
      }
    }
  };
})(window);
