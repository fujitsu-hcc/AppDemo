/**
 * @overview 点検業務向けJavaScript API群(コア/ユーティリティ部)です。
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
 * 点検業務のライブラリ空間です。
 */
var Tenken = {};

/*********************************************************/
/* プログラム内で利用する値の定義 */
/* 各値は利用環境に合わせて変更してください */
/*********************************************************/

Tenken.config = {};

/* シナリオID */
/* シナリオIDは、シナリオ選択画面で選択されたシナリオID */
/* 書き換えられます。                                   */
Tenken.config.ScenarioId = 0;

/* 強制制読み込みモード */
/* AR.Data.getArServerDataの_isSuperReloadに指定する値です。 */
/*   true :強制読み込みを行う                                */
/*   false:行わない。                                        */
Tenken.config.SuperReload=true;

/* データ取得時(点検結果)のデータ受信状態をチェックする  */
/* インターバルタイマルーチンのインターバル時間です。    */
/* 単位はミリ秒。                                        */
Tenken.config.getIntervalTime=500;

/* データ取得時(点検結果)の１回のダウンロード上限数 */
/* 点検結果の同時受信上限数です。                   */
/* 大きな数字にするとメモリやシステムリソース不足で */
/* 失敗したり、異常終了する可能性があります。       */
Tenken.config.DownloadStep = 20;

/* 最大受信申し送り数 登録日時以下の件数のみ受信します。  */
/* 件数を超えた申し送りは受信されないため表示されません。 */
Tenken.config.DownloadMaxCountMsgEvent = 100;

/* 申し送りタイトルの最大文字数 */
Tenken.config.MaxMessageTitleLength = 20;

/* 申し送り内容の最大文字数 */
Tenken.config.MaxMessageLength = 30;

/* 申し送り報告の最大文字数 */
Tenken.config.MaxMessageAnswerLength = 30;

/* ログ設定 */
/* ログの出力レベル  */
/* 0:ERROR  1:WARNING  2:INFO  3:DEBUG */
Tenken.config.loglevel = 2;

/* ログのメッセージPREFIX */
Tenken.config.log_prefix = "AR_Tenken:";

/*print the timing data to log */
Tenken.config.logTimingData = true;

/* ログのメッセージ番号 */
/* errnoの場合で、出力メッセージ内に番号がある場合は、*/
/* その番号を出力する場合があります */
Tenken.config.log_no_trace   = 1000;
Tenken.config.log_no_info    = 2000;
Tenken.config.log_no_warning = 3000;
Tenken.config.log_no_debug   = 4000;
Tenken.config.log_no_error   = 5000;

/* 点検値の前回値が設備がSTOP状態の場合に対象外とするか。 */
/*   true :START状態の結果のみを前回値として扱う            */
/*   false:STOP状態の結果も前回値として扱う("STOP"が表示される） */
Tenken.config.skipStopLastData = true;

/* 未入力の点検項目がある場合の送信可否の設定          */
/*   false:未入力項目がある場合は送信不可)             */
/*   true :未入力項目がある場合も値なしとして送信可能  */
Tenken.config.noinputsubmit = false;

/* 未入力の点検項目がある場合の送信可否の    */
/* 切り替え用チェックボックス表示の有無      */
/*   false=チェックボックスを表示しない      */
/*   true=表示する                           */
Tenken.config.noinputsubmitcheckbox = true;

/* オフライン事前ダウンロード対応フラグ      */
/* 対象は、AR重畳表示定義データ              */
/*   true =事前ダウンロードする              */
/*   false=事前ダウンロードしない            */
Tenken.config.preloadFile = true;

/* 設備テーブルの追加アイコンに指定された    */
/* URLの事前ダウンロードを行うか             */
/*   true =事前ダウンロードする              */
/*   false=事前ダウンロードしない            */
Tenken.config.preloadAssetFile = true;

/* current server URL */
Tenken.config.serverURL = null;

// This account is for Basic Authentication, the server uses Apache to verify it.
Tenken.config.AUTH_USER = {
        USER_ID: "",
        PASSWORD: ""
}

/*********************************************************/
/********************************************************/
/*
 * An array used to store all performance timing data.
 */
Tenken.timingData = [];

/*********************************************************/
/*********************************************************/

/**
 * ARシステムに対してトレースします。
 * @param {String} _user ユーザ名
 * @param {Tenken.traceEvent.Type} _type イベントタイプ
 * @param {Number} _markerid marker.id
 * @param {String} _poiid poi.id
 * @param {Object} _details 詳細オブジェクト
 */
Tenken.traceEvent = function(_user, _type, _markerid, _poiid, _details) {
	var obj = (null == _details) ? new Object() : _details;
	if(null != _markerid) obj.markerid = _markerid;
	if(null != _poiid) obj.poiid = _poiid;
	Tenken.Util.TraceToSystem(_user, _type, obj);
};
/**
 * ARシステムに対するトレースイベントタイプの列挙値です。
 */
Tenken.traceEvent.Type = {
	SCENARIO_SHOW : "JS_SCENARIO_SHOW",
	SCENARIO_PREDOWNLOAD : "JS_SCENARIO_PREDOWNLOAD",
	SCENARIO_START : "JS_SCENARIO_START",
	TENKEN_SHOW : "JS_TENKEN_SHOW",
	TENKEN_PREDOWNLOAD : "JS_TENKEN_PREDOWNLOAD",
	TENKEN_START : "JS_TENKEN_START",
	TENKEN_CONTINUESTART : "JS_TENKEN_CONTINUESTART",
	TENKEN_END : "JS_TENKEN_END",
	MAIN_SHOW : "JS_MAIN_SHOW",
	AR_SHOW : "JS_AR_SHOW",
	AR_MENU_SUBMIT : "JS_AR_MENU_SUBMIT",
	AR_MENU_CHECKLIST : "JS_AR_MENU_CHECKLIST",
	AR_MENU_MESSAGELIST : "JS_AR_MENU_MESSAGELIST",
	AR_MSG_INPUT : "JS_AR_MSG_INPUT",
	AR_MSG_COMPLETE : "JS_AR_MSG_COMPLETE",
	AR_STOPPREVIEW : "JS_AR_STOPPREVIEW",
	AR_TAPARGRAPHIC : "JS_AR_TAPARGRAPHIC",
	SUMMARY_SHOW : "JS_SUMMARY_SHOW",
	SUMMARY_MANUAL : "JS_SUMMARY_MANUAL",
	SUMMARY_MAINTENANCEDOC : "JS_SUMMARY_MAINTENANCEDOC",
	SUMMARY_STOCKLIST : "JS_SUMMARY_STOCKLIST",
	SUMMARY_MAINTENANCEGRAPH : "JS_SUMMARY_MAINTENANCEGRAPH",
	SUMMARY_CHECKLIST : "JS_SUMMARY_CHECKLIST",
	SUMMARY_ADDMESSAGE : "JS_SUMMARY_ADDMESSAGE",
	SUMMARY_ICON : "JS_SUMMARY_ICON",
	SUBMIT_SHOW : "JS_SUBMIT_SHOW",
	SUBMIT_SUBMIT : "JS_SUBMIT_SUBMIT",
	SUBMIT_SUBMIT_SELECT : "JS_SUBMIT_SUBMIT_SELECT",
	SUBMIT_ALL_SELECT : "JS_SUBMIT_ALL_SELECT",
	SUBMIT_ALL_RELEASE : "JS_SUBMIT_ALL_RELEASE",
	CHECKLIST_SHOW : "JS_CHECKLIST_SHOW",
	CHECKLIST_CLEAR_ALL : "JS_CHECKLIST_CLEAR_ALL",
	CHECKLIST_CLEAR : "JS_CHECKLIST_CLEAR",
	MESSAGELIST_SHOW : "JS_MESSAGELIST_SHOW",
	MESSAGELIST_INPUT_MSG : "JS_MESSAGELIST_INPUT_MSG",
	MESSAGELIST_INPUT_REG : "JS_MESSAGELIST_INPUT_REG",
	MESSAGELIST_INPUT_CANCEL : "JS_MESSAGELIST_INPUT_CANCEL",
	ADDMESSAGE_SHOW : "JS_ADDMESSAGE_SHOW"
};
/**
 * HTML部品のdata-ar-eventtype属性を利用して、クリックアクションをトレースします。
 * @param {String} _user ユーザ名
 * @param {Object} _target クリックターゲットエレメント
 */
Tenken.traceEvent.traceButtonEvent = function(_user, _target) {
	var tmpType = Tenken.traceEvent._getEventType(_target);
	if(null == tmpType) return;
	var type = Tenken.traceEvent.Type[tmpType];
	if(null != type) Tenken.traceEvent(_user, type, null, null, null);
};
/**
 * 指定エレメント、および、その親エレメントの、data-ar-eventtype属性値を取得して返します。
 * @param {Object} _target クリックターゲットエレメント
 * @return data-ar-eventtype属性値。値がない場合はnull
 */
Tenken.traceEvent._getEventType = function(_target) {
	var type = null;
	var elm = _target;
	while(null != elm) {
		type = elm.getAttribute("data-ar-eventtype");
		if(null != type)
			return type;
		else
			elm = elm.parentElement;
	}
	return null;
};


/**
 * クラスを継承させます。
 * @param _cls クラス
 * @param _scls 親クラス
 */
Tenken.inherit = function(_cls, _scls){
	_cls.prototype = new _scls();
	_cls.prototype.constructor = _cls;
};


/**
 * 指定数値を0パディングして返します。
 * @param _baseZero 2桁でパディングしたい場合は"00"
 * @param _num 対象数値。正の整数で指定すること
 */
Tenken.paddingZero = function(_baseZero, _num) {
	var tmp = _baseZero + _num;
	return tmp.substring(tmp.length - _baseZero.length);
};


/**
 * 指定の配列要素を追加して返します。
 * @param {Array} _arrayTo 追加先の配列。書き換わります
 * @param {Array} _arrayFrom 追加する値を含む配列
 * @param {Boolean} _unshift 先頭に追加する場合はtrue、末尾に追加する場合はfalse
 * @return {Array} 追加後の_arrayTo
 */
Tenken.putEach = function(_arrayTo, _arrayFrom, _unshift) {
	if((null == _arrayFrom) || (0 == _arrayFrom.length)) return _arrayTo;
	if(null == _arrayTo) _arrayTo = [];
	for(var i = 0; i < _arrayFrom.length; i++) _arrayTo[_unshift ? "unshift" : "push"](_arrayFrom[i]);
	return _arrayTo;
}


/**
 * 表示用文字列化可能な値を表現するクラスです。
 * @param _value 値
 * @param _stringValue 表示用文字列。nullの場合は「値=表示用文字列」と見做す
 */
Tenken.StringableValue = function(_value, _stringValue) {
	this._value = _value;
	this._stringValue = _stringValue;
};
/**
 * 値を返します。
 * @return 値
 */
Tenken.StringableValue.prototype.getValue = function() { return this._value; };
/**
 * 表示用文字列を返します。
 * @return 表示用文字列
 */
Tenken.StringableValue.prototype.toString = function() { return (null == this._stringValue) ? this._value : this._stringValue; };
/**
 * 値/表示用文字列を設定します。
 * @param _value 値
 * @param _stringValue 表示用文字列
 */
Tenken.StringableValue.prototype.setValueAndStringValue = function(_value, _stringValue) { this._value = _value; this._stringValue = _stringValue; };


/**
 * 日時値を表現するクラスです。
 */
Tenken.DatetimeValue = function(_value) {
	Tenken.StringableValue.call(this, _value);
	this._date = (function(){ var d = new Date(); d.setTime(_value); return d; })();
};
Tenken.inherit(Tenken.DatetimeValue, Tenken.StringableValue);
/**
 * 表示用文字列を、「4桁の年/2桁の月/2桁の日(1桁の曜日) 2桁の時:2桁の分」の書式で返します。
 * @extends Tenken.StringableValue.prototype.toString()
 */
Tenken.DatetimeValue.prototype.toString = function() {
	return Tenken.paddingZero("0000", this._date.getFullYear()) + "/" +
		Tenken.paddingZero("00", (this._date.getMonth() + 1)) + "/" +
		Tenken.paddingZero("00", this._date.getDate()) + "(" +
		Tenken.DatetimeValue._DAYLABELS[this._date.getDay()] + ") " +
		Tenken.paddingZero("00", this._date.getHours()) + ":" +
		Tenken.paddingZero("00", this._date.getMinutes());
};
/** 曜日用列挙値。*/
Tenken.DatetimeValue._DAYLABELS = ["日", "月", "火", "水", "木", "金", "土"];

/**
 * 表示用文字列を、「4桁の年/2桁の月/2桁の日 2桁の時:2桁の分:2桁の秒」の書式で返します。
*/
Tenken.DatetimeValue.prototype.toStringFullTime = function() {
	return Tenken.paddingZero("0000", this._date.getFullYear()) + "/" +
		Tenken.paddingZero("00", (this._date.getMonth() + 1)) + "/" +
		Tenken.paddingZero("00", this._date.getDate()) + " " +
		Tenken.paddingZero("00", this._date.getHours()) + ":" +
		Tenken.paddingZero("00", this._date.getMinutes()) + ":" +
		Tenken.paddingZero("00", this._date.getSeconds());
};

Tenken.DatetimeValue.prototype.parseDatetime = function(_strDatetime)
{
	if ( null == _strDatetime )
	{
		return null;
	}
	return Date.parse(_strDatetime);
}

// 数値または数値文字列か判定します。
// true:数値または数値文字列 false:数値、数値文字列以外
Tenken.isNumber = function(_value)
{
	if(("number" != typeof(_value)) && ("string" != typeof(_value))) return false;

    return (_value == parseFloat(_value) && isFinite(_value));
}

Tenken.isURLQueryString = function(_url)
{
	// 問い合わせ(?)があるもの、先頭がhttpで無いものは対象外。
	// http://が先頭にない8文字に満たない場合も対象外。
	if ( null == _url ) return false;
	if (  _url.length < 8 ) return false; 
	var strProtcol=_url.substring(0,4);
	if ( "http" != strProtcol.toLowerCase() ) return false;

	// httpで始まり、クエリ文字列(URLクエリパラメタ指定がある
	if (  0 <= _url.indexOf("?") ) return true;

	return false;
}


/* =======================================================================*/
/* ユーティリティ                                                         */
/* =======================================================================*/
Tenken.Util = {};

/** 何もしないコールバック用メソッドです。 */
Tenken.Util.noop = function(_result){};

Tenken.Util.logTimingData = function (){

    for(var msg in Tenken.timingData){
        var logDate = Tenken.timingData[msg];
        var start = logDate.start, end = logDate.end;
        var message = '###' + msg + ' Start:' + formatDate(start) + ' End:' + formatDate(end) + ' Time taken:' + (end.getTime() - start.getTime()) + ' ms\n';
        Tenken.Util.loginfo(message);
    }
}

function formatDate(date) {
    var strTime = lpad(date.getHours()) + ":" + lpad(date.getMinutes()) + ":" + lpad(date.getSeconds()) + 
    "." + date.getMilliseconds();
    return lpad(date.getMonth()+1) + "/" + lpad(date.getDate()) + "/" + date.getFullYear() + "_" + strTime;
}

function lpad(val){
    if(val < 10) return '0' + val;
    return val;
}

/** 情報ログを出力します。 */
Tenken.Util.loginfo = function(_message, _detail){
	if(_message == null) return;
	if ( null == Tenken.config.loglevel || Tenken.config.loglevel < 2 ) return;
	var message = Tenken.config.log_prefix + _message.toString();
	//message + detailをログに出力します。
	if(_detail) message += ":" + _detail;

	try{
		AR.Log.log(AR.Log.LevelType.INFO, Tenken.config.log_no_info, message, Tenken.Util.noop, Tenken.Util.noop);
	} catch(e){
		alert("ログの出力に失敗しました。"+e);
	}
};

/** ワーニングログを出力します。 */
Tenken.Util.logwarning = function(_message, _detail){
	if(_message == null) return;
	if ( null == Tenken.config.loglevel || Tenken.config.loglevel < 1 ) return;
	var message = Tenken.config.log_prefix + _message.toString();
	//message + detailをログに出力します。
	if(_detail) message += ":" + _detail;

	try{
		AR.Log.log(AR.Log.LevelType.WARNING, Tenken.config.log_no_warning, message, Tenken.Util.noop, Tenken.Util.noop);
	} catch(e){
		alert("ログの出力に失敗しました。"+e);
	}
};

/** デバッグログを出力します。 */
Tenken.Util.logdebug = function(_message, _detail){
	if(_message == null) return;
	if ( null == Tenken.config.loglevel || Tenken.config.loglevel < 3 ) return;
	var message = Tenken.config.log_prefix + _message.toString();
	//message + detailをログに出力します。
	if(_detail) message += ":" + _detail;

	try{
		AR.Log.log(AR.Log.LevelType.INFO, Tenken.config.log_no_debug, message, Tenken.Util.noop, Tenken.Util.noop);
	} catch(e){
			alert("ログの出力に失敗しました。"+e);
	}
};

/** エラーログを出力します。 */
Tenken.Util.logerr = function(_message, _detail){
	if(_message == null) return;
	var code = Tenken.config.log_no_error;
	var message;
;

	if(_message instanceof Error){ //Errorオブジェクトの場合
		if(typeof _message.code == 'number') code = _message.code;
		message = Tenken.config.log_prefix + _message.componentName == null ? _message.toString() : _message.componentName + " : " + _message.toString();
		if(_message.cause != null) message += " Cause : "+_message.cause;
	} else message = Tenken.config.log_prefix + _message.toString(); //それ以外の場合

	//message + detailをログに出力します。
	if(_detail) message += ":" + _detail;
	try{
		AR.Log.log(AR.Log.LevelType.ERROR, code,message,Tenken.Util.noop, Tenken.Util.noop);
	} catch(e){
		alert("ログの出力に失敗しました。"+e);
	}
};

/** トレース出力のonErrorに設定するコールバック関数です。 */
Tenken.Util.traceError = function(_result){
	alert("トレースの出力に失敗しました。\n" + result.getStatus() + "\n"+ _result.getValue());
};


Tenken.Util.TraceToSystem = function(_user, _type, obj)
{
	var message=Tenken.config.log_prefix;

	if ( _user )
	{
		message += "User =[" + _user + "]";
	}
	if ( _type )
	{
		message += "Type =[" + _type + "]";
	}
	if ( obj )
	{
		message += "Obj =[" + obj + "]";
	}
		AR.Log.log(AR.Log.LevelType.INFO, Tenken.config.log_no_trace,message,Tenken.Util.noop, Tenken.Util.traceError);
};

/**
 * ネイティブカメラ起動のonErrorに設定するコールバック関数です。
 */
Tenken.Util.startCameraViewError = function(_result){
	var message = "ネイティブカメラの起動に失敗しました。";
	var detail = _result.getStatus() + ":"+ _result.getValue();
	Tenken.Util.logerr(message, detail);
};

/** ネイティブカメラ停止のonErrorに設定するコールバック関数です。 */
Tenken.Util.stopCameraViewError = function(_result){
	var message = "ネイティブカメラの停止に失敗しました。";
	var detail = _result.getStatus() + ":"+ _result.getValue();
	Tenken.Util.logerr(message, detail);
};

Tenken.Util.startCameraView = function()
{
	AR.Camera.startCameraView(Tenken.Util.noop, Tenken.Util.startCameraViewError);
};

Tenken.Util.stopCameraView = function()
{
	AR.Camera.stopCameraView(Tenken.Util.noop, Tenken.Util.stopCameraViewError);
};

/** マーカー検知に登録したリスナーID */
Tenken.Util.listenerId = "";

/**
 * マーカー検知登録のonSuccessに設定するコールバック関数です。
 */
Tenken.Util.addMarkerListenerSuccess = function(_result){
	//リスナIDをTenken.Util.listenerIdに格納します。登録したマーカー検知イベントリスナの削除に使用します。
	Tenken.Util.listenerId = _result.getValue();
};

/** マーカー検知登録のonErrorに設定するコールバック関数です。*/
Tenken.Util.addMarkerListenerError = function(_result){
	var message ="マーカー検知のイベントリスナ登録に失敗しました。";
	var detail = _result.getStatus() + ":"+ _result.getValue();
	Tenken.Util.logerr(message, detail);
};

Tenken.Util.addMarkerListener = function(_onDetectMarker)
{
	//マーカー検知のイベントリスナ追加です。
	try
	{
		AR.Camera.addMarkerListener( Tenken.Util.addMarkerListenerSuccess, Tenken.Util.addMarkerListenerError, _onDetectMarker, Tenken.Util.noop);
	}
	catch(e){
		Tenken.Util.logerr(e);
	}
};

/** マーカー検知時のイベントリスナ削除に成功した場合のコールバック関数です。 */
Tenken.Util.removeMarkerListenerSuccess = function(_result){
	Tenken.Util.listenerId = "";
};

/** マーカー検知削除のonErrorに設定するコールバック関数です。 */
Tenken.Util.removeMarkerListenerError = function(){
	var message = "マーカー検知のイベントリスナ削除に失敗しました。\n";
	var detail = _result.getStatus() + ":"+ _result.getValue();
	Tenken.Util.logerr(message, detail);
};

Tenken.Util.removeMarkerListener = function()
{
	//イベントリスナを削除します。
	try{
		AR.Camera.removeMarkerListener(Tenken.Util.listenerId, Tenken.Util.removeMarkerListenerSuccess , Tenken.Util.removeMarkerListenerError);
	} catch (e){
		Tenken.Util.logerr(e);
	}
}

/** 取得した動作モードを変数に格納します。 */
Tenken.Util.getOperationModeSuccess = function(_result)
{
	//取得した動作モードを変数に格納します。
	var operationMode = _result.getValue();
	Tenken.Storage.OperationMode.set(operationMode);
};

/** 動作モード取得のonErrorに設定するコールバック関数です。 */
Tenken.Util.getOperationModeError = function(_result)
{
	var message = "動作モードの取得に失敗しました。\n";
	var detail = _result.getStatus() + ":"+ _result.getValue();

	Tenken.Util.logerr(message, detail);
};

/** 動作モードを取得します。 */
Tenken.Util.getOperationMode = function(_funcSuccess, _funcError)
{
	try{
		Tenken.Storage.OperationMode.remove();
		// 成功および失敗時のコールバックが指定されていれば保存する
		// 指定されていない場合は、デフォルトのコールバックを指定します。
		if ( null != _funcSuccess )
		{
			var funcSuccess=_funcSuccess;
		}
		else
		{
			var funcSuccess=Tenken.Util.getOperationModeSuccess;
		}
		if ( null != _funcError )
		{
			var funcError=_funcError;
		}
		else
		{
			var funcError=Tenken.Util.getOperationModeError;
		}
		AR.OS.getOperationMode(funcSuccess, funcError);
	} catch (e){
		Tenken.Util.logerr(e);
	}
};

/** get server URL */
Tenken.Util.getArServerURL = function(_onSuccess, _onError){
    try{
        var funcSuccess = Tenken.Util.getServerURLSuccess;
        if(_onSuccess){
            funcSuccess = _onSuccess;
        }

        var funcError = Tenken.Util.getServerURLError;
        if(_onError){
            funcError = _onError;
        }

        AR.Data.getArServerInfo(funcSuccess, funcError);
    } catch (e){
        Tenken.Util.logerr(e);
    }
};
Tenken.Util.getServerURLSuccess = function(_result){
    Tenken.config.serverURL = _result.getValue();
};
Tenken.Util.getServerURLError = function(_result){

    var message = "Get server URL failed。\n";
    var detail = _result.getStatus() + ":"+ _result.getValue();

    Tenken.Util.logerr(message, detail);
};

Tenken.Toggle = {};

Tenken.Toggle.AbstractType = function(_array) {
	this.array = _array;
};

Tenken.Toggle.AbstractValueType = function(_array) {
	Tenken.Toggle.AbstractType.call(this, _array);
};
AR.Util.inherit(Tenken.Toggle.AbstractValueType, Tenken.Toggle.AbstractType);
Tenken.Toggle.AbstractValueType.prototype.parse = function(_str) {
	return _str;
};

Tenken.Toggle.EnumType = function(_array, _enums) {
	Tenken.Toggle.AbstractValueType.call(this, _array);
	this.enums = _enums;
};
AR.Util.inherit(Tenken.Toggle.EnumType, Tenken.Toggle.AbstractValueType);

Tenken.Toggle.EnumType.prototype.parse = function(_str) {
	for(var i = 0; i < this.enums.length; i++) if(_str == this.enums[i]) return this.enums[i];
	return null;
};


Tenken.Toggle.WEATHERTYPE = new Tenken.Toggle.EnumType(false, ["晴", "曇", "雨", "雪"]);
Tenken.Toggle.ASSETSTATUSTYPE = new Tenken.Toggle.EnumType(false, ["START", "STOP"]);
Tenken.Toggle.OKNGTYPE = new Tenken.Toggle.EnumType(false, ["OK", "NG"]);
Tenken.Toggle.MARUBATSUTYPE = new Tenken.Toggle.EnumType(false, ["○", "×"]);



