/**
 * @overview 点検業務向けJavaScript API群(ストレージ)です。
 * @copyright Copyright 2014 - 2016 FUJITSU LIMITED
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


/**
 * 点検業務ストレージのライブラリ空間です。
 */
Tenken.Storage = {};

var indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.msIndexedDB;
Tenken.Storage.isDB = function(){
    //Windows版ARアプリはIndexedDBが使用できない
    return navigator.userAgent.match(/(Windows)/)==null && !!indexedDB };
};

Tenken.Storage.init = function(){
    if(!indexedDB || Tenken.Storage.DB && Tenken.Storage.DB.db) {
        return Q.when();
    }

    var def = Q.defer();
    var DB = {};
    var request = indexedDB.open("tenken", 1);
    request.onupgradeneeded = function(event) {
        DB.db = event.target.result;
        var store = DB.db.createObjectStore("tenkenStore", { keyPath: "key"});
    };

    request.onsuccess = function(event) {
        DB.db = event.target.result;
        def.resolve();
    };

    request.onerror = function(event){
        def.reject(e);
    };

    DB.getTransaction = function(store, mode){
        return DB.db.transaction(["tenkenStore"], "readwrite");
    };
    DB.getStore = function(store){
        return DB.getTransaction().objectStore("tenkenStore");
    };
    DB.get = function(key){

        var d = Q.defer();
        var request = DB.getStore("tenkenStore").get(key);
        request.onsuccess = function(event){

            if(event.target.result==null){
                d.resolve(null);
            } else {
                d.resolve(event.target.result.value);
            }
        };
        request.onerror = function(e){
            d.reject(e);
        };

        return d.promise;
    };

    DB.put = function(data){
        var d = Q.defer();
        var request = DB.getStore("tenkenStore").put(data);
        request.onsuccess = function(event){
            d.resolve();
        };
        request.onerror = function(e){
            d.reject(e);
        };
        return d.promise;
    };

    DB.delete = function(key){
        var d = Q.defer();
        var request = DB.getStore("tenkenStore").delete(key);
        request.onsuccess = function(event){
            d.resolve();
        };
        request.onerror = function(e){
            d.reject(e);
        };
    };
    DB.clear = function(){
        var d = Q.defer();
        var request = DB.getStore("tenkenStore").clear();
        request.onsuccess = function(event){
            d.resolve();
        };
        request.onerror = function(e){
            d.reject(e);
        };
        return d.promise;
    };

    DB.close = function(){
        if(DB.db) DB.db.close();
    };

    Tenken.Storage.DB = DB;
    return def.promise;
};


/**
 * 点検業務ストレージのアクセサクラスです。
 * @param {Object} _key ストレージのキー
 */
Tenken.Storage.Accessor = function(_key, _withScenarioId, _useStorage) {
	this._key = _key;
    this._withScenarioId = _withScenarioId;
    this._useStorage = _useStorage;
    var self = this;
};
/**
 * 値を返します。
 * @return {Object} 値
 */
Tenken.Storage.Accessor.prototype.get = function() {
    var key = this._key;
    if( true == this._withScenarioId ) {
        key += "-" + Tenken.Storage.ScenarioId.get();
    }
    if(!this._useStorage){
        if (Tenken.Storage.isDB()) {
            return Q.when(key)
                .then(Tenken.Storage.DB.get)
        } else {
            return Q.when(localStorage.getItem(key));
        }
    } else {
        return localStorage.getItem(key);
    }
};
/**
 * 値を設定します。
 * @param {Object} _value 値
 */
Tenken.Storage.Accessor.prototype.set = function(_value) {

    var key = this._key;
    if( true == this._withScenarioId ) {
        key += "-" + Tenken.Storage.ScenarioId.get();
    }
    if (!this._useStorage && Tenken.Storage.isDB()) {
        return Q.when({key:key, value:_value})
            .then(Tenken.Storage.DB.put)
    } else {
        localStorage.setItem(key, _value);
        return Q.when();
    }

};
/**
 * 値を削除します。
 */
Tenken.Storage.Accessor.prototype.remove = function() {

    var key = this._key;
    if( true == this._withScenarioId ) {
        key += "-" + Tenken.Storage.ScenarioId.get();
    }
    if(!this._useStorage && Tenken.Storage.isDB()){
        return Q.when(key)
            .then(Tenken.Storage.DB.delete);
    } else {
        localStorage.removeItem(key);
        return Q.when();
    }

};

/**
 * 値が存在するか否かを判定して返します。
 * @return {Boolean} 値が存在する場合はtrue、それ以外はfalse
 */
Tenken.Storage.Accessor.prototype.isExist = function()
{
    var key = this._key;
    if( true == this._withScenarioId ){
        key += "-" + Tenken.Storage.ScenarioId.get();
    }

    if(!this._useStorage && Tenken.Storage.isDB()){
        return Q.when(key)
            .then(Tenken.Storage.DB.get)
    } else {
        return Q.when(null != localStorage.getItem(key));
    }
};


/** 点検開始日時アクセサ。*/
Tenken.Storage.startDatetime = new Tenken.Storage.Accessor(TenkenConst.StorageName.startDatatime, true, true);


/** 点検作業者アクセサ。*/
Tenken.Storage.operator = new Tenken.Storage.Accessor(TenkenConst.StorageName.operator, true, true);

/** Assetアクセサ。*/
Tenken.Storage.lastAssetData = new Tenken.Storage.Accessor(TenkenConst.StorageName.asset, true, false);

/** 前回の申し送りEventアクセサ。*/
Tenken.Storage.lastTenkenEventData = new Tenken.Storage.Accessor(TenkenConst.StorageName.lastTenkenEvent, true, false);

/** 前回の点検Eventアクセサ。*/
Tenken.Storage.lastMessageEventData = new Tenken.Storage.Accessor(TenkenConst.StorageName.lastMessageEvent, true, false);

/** 今回の点検Eventアクセサ。*/
Tenken.Storage.currentTenkenEventData = new Tenken.Storage.Accessor(TenkenConst.StorageName.currentTenkenEevnt, true, false);

/** 今回の申し送りEventアクセサ。*/
Tenken.Storage.currentMessageEventData = new Tenken.Storage.Accessor(TenkenConst.StorageName.currentMessageEvent, true, false);

/** 通信モードアクセサ。*/
Tenken.Storage.OperationMode = new Tenken.Storage.Accessor(TenkenConst.StorageName.OperationMode, false, true);

/** 作業者データアクセサ。*/
Tenken.Storage.UserData = new Tenken.Storage.Accessor(TenkenConst.StorageName.username, true, false);

/** 最終ダウンロード日時アクセサ。*/
Tenken.Storage.DownloadDate = new Tenken.Storage.Accessor(TenkenConst.StorageName.DownloadDate, true, true);


/** シーンアクセサ。*/
Tenken.Storage.SceneList = new Tenken.Storage.Accessor(TenkenConst.StorageName.scene, true, false);
Tenken.Storage.SceneNames = new Tenken.Storage.Accessor(TenkenConst.StorageName.SceneNames, true, false);

/** AR重畳表示定義データアクセサ。*/
Tenken.Storage.SuperimposedGraphic = new Tenken.Storage.Accessor(TenkenConst.StorageName.SuperimposedGraphic, true, false);

/** 点検項目テーブルデータアクセサ。*/
Tenken.Storage.TenkenTable = new Tenken.Storage.Accessor(TenkenConst.StorageName.tenkentable, true, false);

/** シナリオアクセサ。*/
Tenken.Storage.ScenarioList = new Tenken.Storage.Accessor(TenkenConst.StorageName.scenario, false, true);
/** 選択シナリオ名・ID */
Tenken.Storage.ScenarioId = new Tenken.Storage.Accessor(TenkenConst.StorageName.ScenarioId, false, true);
Tenken.Storage.ScenarioName = new Tenken.Storage.Accessor(TenkenConst.StorageName.ScenarioName, false, true);
/** 最終シナリオダウンロード日時アクセサ。*/
Tenken.Storage.DownloadScenario = new Tenken.Storage.Accessor(TenkenConst.StorageName.DownloadScenario, false, true);

/** tenken tables version information */
Tenken.Storage.TenkenVersions = new Tenken.Storage.Accessor(TenkenConst.StorageName.tenkenVersions, true, true);

/** server URL informaion */
Tenken.Storage.serverURL = new Tenken.Storage.Accessor(TenkenConst.StorageName.serverURL, true, true);

/**
 * シナリオデータ以外のストレージデータをクリアします。
 */

Tenken.Storage.clearWithOutScenario = function() {

    return Q.all([
        Tenken.Storage.startDatetime.remove(),
        Tenken.Storage.operator.remove(),
        //Tenken.Storage.OperationMode.remove(),
        Tenken.Storage.lastAssetData.remove(),
        Tenken.Storage.lastTenkenEventData.remove(),
        Tenken.Storage.lastMessageEventData.remove(),
        Tenken.Storage.currentTenkenEventData.remove(),
        Tenken.Storage.currentMessageEventData.remove(),
        Tenken.Storage.UserData.remove(),
        Tenken.Storage.DownloadDate.remove(),
        Tenken.Storage.SceneList.remove(),
        Tenken.Storage.SceneNames.remove(),
        Tenken.Storage.SuperimposedGraphic.remove(),
        Tenken.Storage.TenkenTable.remove(),
        Tenken.Storage.TenkenVersions.remove(),
        Tenken.Storage.serverURL.remove()
    ]);
};
/**
 * 全点検業務ストレージデータをクリアします。
 */
Tenken.Storage.clear = function() {
        return Q.when()
            .then(function(){
            var scenarioList = JSON.parse(Tenken.Storage.ScenarioList.get());
            if (null != scenarioList && scenarioList.length > 0) {
                return Q.all(scenarioList.map(function(scenario){
                    Tenken.Storage.ScenarioId.set(scenario.scenarioId);
                    return Tenken.Storage.clearWithOutScenario();
                }))
            } else {
                return Q.when();
            }
        })
        .then(function(){
            return Q.all([
                Tenken.Storage.ScenarioId.remove(),
                Tenken.Storage.ScenarioName.remove(),
                Tenken.Storage.ScenarioList.remove(),
                Tenken.Storage.DownloadScenario.remove()]);
        });
};

/**
 * 作業中ストレージデータをクリアします。
 */
Tenken.Storage.clearCurrent = function() {
    return Q.all([
        Tenken.Storage.startDatetime.remove(),
        Tenken.Storage.operator.remove(),

        Tenken.Storage.currentTenkenEventData.remove(),
        Tenken.Storage.currentMessageEventData.remove()
    ]);
};

/* 点検アプリに必要なダウンロードデータが存在するかチェックします */
Tenken.Storage.AllDownloadIsExist = function()
{
    return Q.all([
        Tenken.Storage.lastAssetData.isExist(),
        Tenken.Storage.UserData.isExist(),
        Tenken.Storage.ScenarioList.isExist(),
        Tenken.Storage.SceneList.isExist(),
        Tenken.Storage.TenkenTable.isExist(),
        Tenken.Storage.DownloadDate.isExist()
    ]).spread(function (asset, user, scenario, scene, table, date) {
        return Q.when(asset && user && scenario && scene && table && date);
    });
};

/*
 * clear uploaded data after submit
 */
Tenken.Storage.clearAfterSubmit = function() {
    return Q.all([
        Tenken.Storage.startDatetime.remove(),
        Tenken.Storage.operator.remove(),
        Tenken.Storage.currentTenkenEventData.remove(),
        Tenken.Storage.currentMessageEventData.remove()
    ]);

};