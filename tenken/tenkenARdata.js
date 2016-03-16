/**
 * @overview 点検業務向けJavaScript API群(データ送受信機能)です。
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
 *
 * 機能:
 *    FUJITSU Software Interstage AR Processing Server(以後ARのREST APIを
 *     利用して、データの送信・受信・削除の機能を提供します。
 *    本機能は、点検アプリケーションで必要とするARの送信・受信・削除の
 *    一部の機能のみを提供します。
 *      ・データ受信(AR.Data.getArServerDataのquad指定)
 *      ・データ送信(AR.Data.postArServerDataのquad指定)
 *      ・データ削除(AR.Data.deleteArServerDataのqentities指定)
 */

// 例外時情報出力マクロ
var TenkenARdebugException = function(_function, _e)
{
	alert("Exception : " + _function + "\n" + _e);
}

// ARデータ管理用定義
var TenkenARvalue = {};

// AR実行サーバのQuadを表現するクラスです。
// データの送受信時に使用します。
TenkenARvalue.Quad = function(_qtypename)
{
	this.qtypeName=_qtypename;
	this.id;
	this.version;
	this.qvalues;
	return this;
};

// AR実行サーバのQValueを表現するクラスです。
// データの送受信時に使用します。
TenkenARvalue.QValue = function(_qtypeName, _qattributeName, _stringValue, _longValue, _floatValue )
{
	this.qtypeName = _qtypeName;
	this.qattributeName = _qattributeName;
	this.stringValue = _stringValue;
	this.longValue = _longValue;
	this.floatValue = _floatValue;
	this.version;
};

// AR実行サーバのデータの削除時するクラスです。
TenkenARvalue.QDelete = function(_qentityid, _version )
{
	this.qentityid = _qentityid;
	this.version = parseInt(_version);
};

// AR実行サーバのquad検索のクエリを表現するクラスです。
TenkenARvalue.QuadQuery = function()
{
	this.type;
	this.limitRange;
	this.qattributeOrderIndexRange;
	this.qtypeNameRages;
	this.whereExpressions;
	this.sortOrderExpressions;
	return this;
};

// AR実行サーバのquad検索クエリの範囲を表現するクラスです。
// コンストラクタでendを省略するとstartと同じ値が格納されます。
TenkenARvalue.Range = function(_start, _end)
{
	this.start = _start;
	if(typeof _end == "undefined") this.end = _start;
	else this.end = _end;
	return this;
};

// AR実行サーバのquad検索クエリのExpressionを表現するクラスです。
TenkenARvalue.QuadQueryExpression = function(_nameRange, _valueRange, _type, _desc)
{
	this.qattributeNameRanges = _nameRange;
	this.qvalueRanges = _valueRange;
	this.qvalueType = _type;
	this.desc = _desc;
	return this;
};

// QuadQueryクラスからquad検索文字列を生成します。
TenkenARvalue.makeQuadQuery = function(_qQuery)
{
	try
	{
	var query="quads?";
	if(_qQuery == null) return query;
	if(_qQuery.type != null) query += "type=" + _qQuery.type;
	if(_qQuery.limitRange != null) query += "&limitRange=" + JSON.stringify(_qQuery.limitRange);
	if(_qQuery.qattributeOrderIndexRange != null) query += "&qattributeOrderIndexRange=" + JSON.stringify(_qQuery.qattributeOrderIndexRange);
	if(_qQuery.qtypeNameRanges != null) query += "&qtypeNameRanges=" + JSON.stringify(_qQuery.qtypeNameRanges);
	if(_qQuery.whereExpressions != null) query += "&whereExpressions=" + JSON.stringify(_qQuery.whereExpressions);
	if(_qQuery.sortOrderExpressions != null) query += "&sortOrderExpressions=" + JSON.stringify(_qQuery.sortOrderExpressions);
	return query;
	}
	catch (e)
	{
		TenkenARdebugException("TenkenARvalue.makeQuadQuery" , e);
	}
};

//============================================================================
// 共有部品定義
//============================================================================
// AR実行サーバとデータの送受信を行うクラスです。
var TenkenARdata = function (_tablename)
{
	if ( null == _tablename )
	{
		throw ( "IllegalArgument:undefined _tablename" );
	}

	if (!(this instanceof TenkenARdata))
	{
		return new TenkenARdata(_tablename);
	}

	// プロパティ
	this.tablename = _tablename;  // データ送受信テーブル名
	this.maxLimitRange=100; // 最大受信数(デフォルト100個）：受信時のlimitRange
	this.getMaxCount=0;   // 送信・受信上限数(検索結果の上位ｎ個のみを取得する場合に設定)。0は上限無しです。
	this.reload=true; // 強制ロード
	this.useOfflineStorage=true; // オフラインストレージを使用するか否か設定(true=利用、false=利用せず)

	this.maxLimitRangeSend=10; // 1回の送信・削除並行処理数(この値が大きいとDATAM:ERROR:71002のエラーが発生しやすくなります)

	// データ送受信カウンタ類

	// データ送受信・結果データ
	this.where=null;      // 検索条件
	this.sort=null;       // ソート条件
	this.sortdesc=false;  // ソート順 (false昇順 , true:降順)

	this.result=null;
	this.status=null;
	this.detail=null;

	// コールバック（呼び出し元のコールバック関数）
	this.callBackGetCountSuccess=null;
	this.callBackGetCountError=null;
	this.callBackGetDataSuccess=null;
	this.callBackGetDataError=null;
	this.callBackPostDataSuccess=null;
	this.callBackPostDataError=null;
	this.callBackDeleteDataSuccess=null;
	this.callBackDeleteDataError=null;

	// 内部作業用
	this.dataGetValue=[];   // 受信データ(get)を一時保存
	this.dataPostValue=[];  // 送信データ(post)を一時保存
	this.dataDelete=[];     // 削除データ(delete)を一時保存
	this.dataCount=0;       // 送受信中データ数。
							// 送受信完了後は送受信が完了した数を表します。
	this.dataNextCount=0;   // 次に処理する先頭インデックス値
	this.dataMaxCount=0;    // 送信・受信・削除すべき最大数
	this.dataSendOKCount=0; // post(Quad)/delete(Qentity)で送信成功したデータ数
	this.dataSendNGCount=0; // post(Quad)/delete(Qentity)で送信失敗したデータ数

	this.busy=false; 	  		// 通信中フラグ (true=通信中 false=未通信)
	this.complete=false; 	  	// 送受信中フラグ (true=通信中 false=送受信完了)

	// インターバルタイマー(ミリ秒単位): 0はインタバールタイムを使用しない。
	this.IntervalTime = 500;

	// インターバルタイマーID
	this.IntervalId=null;

	// テーブル名取得
	this.getTableName = function()
	{
		return this.tablename;
	}

	// テーブル名設定
	this.setTableName = function(_tablename)
	{
		this.tablename = _tablename;
	}
	// インターバルタイマー値設定
	this.setIntervalTime = function(_intervalTime)
	{
		this.IntervalTime = _intervalTime;
	}
	// インターバルタイマー値取得
	this.getIntervalTime = function()
	{
		return this.IntervalTime;
	}

	// １回の受信最大数
	this.setMaxLimitRange = function(_maxLimitRange)
	{
		if ( null != _maxLimitRange && 0 < _maxLimitRange && _maxLimitRange <= 100 )
		{
			this.maxLimitRange = _maxLimitRange;
		}
		else
		{
			throw("setMaxLimitRange: Error parameter");
		}
	}
	// １回の受信最大数値取得
	this.getMaxLimitRange = function()
	{
		return this.maxLimitRange;
	}

	// １回の送信並列最大数
	this.setMaxLimitRangeSend = function(_maxLimitRange)
	{
		if ( null != _maxLimitRange && 0 < _maxLimitRange && _maxLimitRange <= 100 )
		{
			this.maxLimitRangeSend = _maxLimitRange;
		}
		else
		{
			throw("setMaxLimitRangeSend: Error parameter");
		}
	}
	// １回の送信並列最大数値取得
	this.getMaxLimitRangeSend = function()
	{
		return this.maxLimitRangeSend;
	}

	// 受信上限数
	this.setGetMaxCount = function(_count)
	{
		if ( null != _count && 0 <= _count )
		{
			this.getMaxCount = _count;
		}
		else
		{
			throw("setGetMaxCount: Error parameter");
		}
	}
	// 受信上限数取得
	this.getGetMaxCount = function()
	{
		return this.getMaxCount;
	}

	// 強制リロード値設定
	this.setReload = function(_reload)
	{
		this.reload = _reload;
	}
	// 強制リロード値取得
	this.getReload = function()
	{
		return this.reload;
	}

	// オフラインストレージ値設定
	this.setUseOfflineStorage = function(_useOfflineStorage)
	{
		this.useOfflineStorage = _useOfflineStorage;
	}
	// オフラインストレージ値取得
	this.getuseOfflineStorage = function()
	{
		return this.useOfflineStorage;
	}

	// 検索条件追加
	// AR.Data.getArServerDataに指定するクエリパタメータwhereExpressionsに
	// 指定する検索条件を追加します。
	// @param {String} _nameStart  検索対象のQAttribute名を指定します。
	//                             複数指定の場合にはnameRangesのstartとなりま
	//                             す。
	// @param {String} _nameEnd    検索対象のQAttribute名を指定します。
	//                             複数指定の場合にはnameRangesのendとなりま
	//                             す。
	// @param {String/Number} _valueStart _nameStartまたは_nameEndに指定した
	//                                    QAttribute名の中から検索する値を
	//                                    指定します。(数値または文字列)
	// @param {String/Number} _valueEnd   _nameStartまたは_nameEndに指定した
	//                                    QAttribute名の中から検索する値を
	//                                    指定します。(数値または文字列)
	// @param {String} _type 検索対象の属性(STRING/LONG/FLOAT)を指定します。
	// @return true:正常に追加完了  false:追加失敗
	//
	// 本メソッドを複数回指定して検索条件を追加した場合には、
	// 各条件はAND条件になります。
	// なお、_valueStartおよび_valueEndが配列型で指定した場合、
	// その配列内のデータをOR条件として検索条件に追加します。
	// なお、条件指定のパラメータの上限、下限数は、利用しているARの仕様に
	// 従います。本メソッドでは上限・下限値、上限数をチェックしません。
	//
	// 指定例:
	//   1)検索条件が１つ
	//     QAttribute="Target1"の値が"abc"であるものを取得する場合。
	//      addWhere( "Target1", null, "abc", null, "STRING");
	//
	//   2)検索条件が２つ(AND条件)
	//     QAttribute="Target1"の値が"abc"、かつ"Target2"が150であるものを
	//     取得する場合。
	//      addWhere( "Target1", null, "abc", null, "STRING");
	//      addWhere( "Target2", null, 150, null, "LONG");
	//
	//   3)検索条件を１つ(OR条件)
	//     QAttribute="Target3"の値が0または40であるものを取得する場合。
	//      addWhere( "Target3", null, [0, 40], null, "LONG");
	//
	this.addWhere = function(_nameStart, _nameEnd, _valueStart, _valueEnd, _type)
	{
		if ( (null == _nameStart && null == _nameEnd) ||
   			 (null == _valueStart && null == _valueEnd) ||
			 null == _type ) return false;

		// qvalueType
		if ( _type != "LONG" && _type != "STRING" && _type != "FLOAT" )
		{
			throw("addWhere : invalid qvalueType");
			return false;
		}

		if (  null != _nameEnd )
		{
			var nameRanges=new TenkenARvalue.Range(_nameStart,_nameEnd);
		}
		else
		{
			var nameRanges=new TenkenARvalue.Range(_nameStart);
		}

		// whereExpressions
		if ( _valueStart instanceof Array )
		{
			// 複数指定(or条件)
			if ( null != _valueEnd && !(_valueEnd instanceof Array)) 
			{
				// 配列指定の場合はSTART,ENDとも配列である必要がある。
				throw("addWhere : invalid _valueEnd");
			}
			else if ( null == _valueEnd || _valueEnd instanceof Array) 
			{
				var where = new Array();
				len=_valueStart.length;
				for ( var i=0 ; i < len ; i++ )
				{
					var valueRange=null
					if ( null != _valueEnd && null != _valueEnd[i] )
					{
						valueRange=new TenkenARvalue.Range(_valueStart[i], _valueEnd[i]);				}
					else
					{
						valueRange=new TenkenARvalue.Range(_valueStart[i]);
					}
					where.push(valueRange);
				}
			}
		}
		else
		{
			// 値の単一指定(非配列)
			if (   null != _valueEnd && _valueEnd instanceof Array )
			{
				// 配列指定の場合はSTART,ENDとも配列である必要がある。
				throw("addWhere : invalid _valueEnd");
			}
			else if ( null != _valueEnd )
			{
				var where=new TenkenARvalue.Range(_valueStart,_valueEnd);
			}
			else
			{
				var where=new TenkenARvalue.Range(_valueStart);
			}
		}

		// qattributeNameRanges
		if ( null == this.where ) this.where = new Array();

		// 検索条件配列に追加する
		this.where.push(new TenkenARvalue.QuadQueryExpression(nameRanges, where, _type, this.sortdesc));
		return true;
	}

	// 検索条件クリア
	this.clearWhere = function()
	{
		this.where=null;
	}

	// ソート条件追加
	this.addSort = function(_nameStart, _nameEnd, _valueStart, _valueEnd, _type)
	{
		if ( null == _nameStart && null == _nameEnd )
		{
			throw ( "IllegalArgument:addSort: undefined nameStart &&  nameEnd" );
		}

		// qvalueType
		if ( _type != "LONG" && _type != "STRING" && _type != "FLOAT" )
		{
			throw("addSort : invalid qvalueType");
			return false;
		}

		// qattributeNameRanges
		if (  null != _nameEnd )
		{
			var nameRanges=new TenkenARvalue.Range(_nameStart,_nameEnd);
		}
		else if (  null != _nameStart )
		{
			var nameRanges=new TenkenARvalue.Range(_nameStart);
		}

		// sort条件指定
		if ( _valueStart instanceof Array )
		{
			if ( null != _valueEnd && !(_valueEnd instanceof Array))
			{
				// 配列指定の場合はSTART,ENDとも配列である必要がある。
				throw("addSort : invalid _valueEnd");
			}
			else if ( null == _valueEnd || _valueEnd instanceof Array)
			{	
				// 複数指定(or条件)
				var sort = new Array();
				len=_valueStart.length;
				for ( var i=0 ; i < len ; i++ )
				{
					var valueRange=null
					if ( null != _valueEnd && null != _valueEnd[i] )
					{
						valueRange=new TenkenARvalue.Range(_valueStart[i], _valueEnd[i]);				}
					else
					{
						valueRange=new TenkenARvalue.Range(_valueStart[i]);
					}
					sort.push(valueRange);
				}
			}
		}
		else
		{
			// 値の単一指定(非配列)
			if (   null != _valueEnd && _valueEnd instanceof Array )
			{
				// 配列指定の場合はSTART,ENDとも配列である必要がある。
				throw("addSort : invalid _valueEnd");
			}
			else if (  null != _valueEnd )
			{
				var sort=new TenkenARvalue.Range(_valueStart,_valueEnd);
			}
			else if ( null != _valueStart )
			{
				var sort=new TenkenARvalue.Range(_valueStart);
			}
			else
			{
				var sort=undefined;
			}
		}

		// qattributeNameRanges
		if ( null == this.sort ) this.sort = new Array();

		// ソート条件配列に追加する
		this.sort.push(new TenkenARvalue.QuadQueryExpression(nameRanges, sort, _type,  this.sortdesc));
		return true;
	}
	// ソート条件クリア
	this.clearSort = function()
	{
		this.sort=null;
	}
	// ソート降順設定(false=昇順(デフォルト),true=降順)
	this.setSortDesc = function(_desc)
	{
		if ( _desc ) this.sortdesc=_desc;
	}
	// ソート降順取得
	this.getSortDesc = function()
	{
		return this.sortdesc;
	}

	// 通信中フラグ取得
	this.getBusyStatus = function()
	{
		return this.busy;
	}

	// 送受信完了フラグ取得
	this.getCompleteStatus = function()
	{
		return this.complete;
	}

	// データカウント数取得
	this.getDataCount = function()
	{
		return this.dataCount;
	}

	// 受信データ取得(配列[Object形式])
	this.getDataValue = function()
	{
		return this.dataGetValue;
	}

	// 結果取得
	this.getResult = function()
	{
		return this.result;
	}

	// ステータス取得
	this.getStatus = function()
	{
		return this.status;
	}

	// 詳細取得
	this.getDetail = function()
	{
		return this.detail;
	}

	// データカウント数・成功コールバック
	this.getArDataCountSuccess = function(_result)
	{
		try
		{
			if ( null != _result.getValue() )
			{
				var result=_result.getValue();
			}
			// データカウント数の保存
			this.dataCount=result.unlimitedRecordCount;

			if ( this.callBackGetCountSuccess ) this.callBackGetCountSuccess(_result);
		}
		catch (e)
		{
			TenkenARdebugException("TenkenARdata.getARDataCountSuccess" , e);
		}
	}

	// データカウント数・失敗コールバック
	this.getArDataCountError = function(_result)
	{
		try
		{
			this.result=_result;

			var message = "データカウント数の取得に失敗しました。動作モードとネットワーク状況を確認して再度お試しください。(" + this.tablename + ")\n";
			this.detail="";
			if(_result.getStatus() == "AR_HTTP_EXCEPTION")
			{
				this.detail = _result.getValue().status + " : " + _result.getValue().statusText + "\n" + _result.getValue().responseText;
			} else
			{
				this.detail += _result.getStatus() + "\n"+ _result.getValue();
			}

			this.completeGetData();

			if ( this.callBackGetCountError ) this.callBackGetCountError(_result);
		}
		catch (e)
		{
			TenkenARdebugException("TenkenARdata.getARDataCountError" , e);
		}
	}

	this.getArDataCount = function(_onSuccess, _onError)
	{
		try
		{
			this.callBackGetCountSuccess=_onSuccess;
			this.callBackGetCountError=_onError;

			//検索クエリオブジェクトを作成します。
			var query = new TenkenARvalue.QuadQuery();
			query.type = "COUNT";

			//利用者定義データが登録されているqtypeを指定します。
			query.qtypeNameRanges = new Array(new TenkenARvalue.Range(this.tablename));

			// 検索条件指定
			if ( null != this.where )
			{
				query.whereExpressions=this.where;
			}

			// ソート条件指定(カウントのみなのでソートの必要は無し)

			//文字列に変換します。
			var getQuery = TenkenARvalue.makeQuadQuery(query);


			//AR実行サーバから点検項目テーブルデータを取得します。
			//コールバック内でTenkenARdataのthisを利用するため、bindを
			//利用しています。
			//bindは古いHTMLレンダリングエンジンでは利用できない場合が
			//あります。

			AR.Data.getArServerData(
				getQuery,
				this.reload,
				this.getArDataCountSuccess.bind(this),
				this.getArDataCountError.bind(this)
				);
		}
		catch (e)
		{
			TenkenARdebugException("TenkenARdata.getARDataCount" , e);
		}
	}

	// JSONオブジェクトから利用者定義データを抽出します。
	this.extractData = function(_result)
	{
		try
		{
			var data=_result.getValue();
			if ( null == data ) return;

			//取得したレコード数です
			var recordCount = data.records.length;

			this.dataCount += recordCount;
			for(var recordIndex = 0; recordIndex < recordCount; recordIndex++)
			{
				//レコードを一つずつ調べます。
				var record = data.records[recordIndex];
				var valueLength = record.qvalues.length;
				var value = new Object();

				value.version = record.version;
				value.qentityId = record.id;

				//使用するqvalueの数だけ取得します。attributeNameで判断します。
				for(var valueIndex = 0; valueIndex < valueLength; valueIndex++)
				{

					var qvalue = record.qvalues[valueIndex];
					if ( null != qvalue.stringValue )
					{
						value[qvalue.qattributeName] = qvalue.stringValue;
					}
					else if ( null != qvalue.longValue )
					{
						value[qvalue.qattributeName] = qvalue.longValue;
					}
                    else if ( null != qvalue.floatValue )
                    {
                        value[qvalue.qattributeName] = qvalue.floatValue;
                    }
				}

				// データ保存
				if ( null == this.dataGetValue ) this.dataGetValue = new Array();
				this.dataGetValue.push(value);
			}
			// 最後のデータまで取得したらコールバックルーチンを呼ぶ
			if ( this.dataCount >= this.dataMaxCount )
			{
				// データ受信後共通終了処理
				this.completeGetData();

				if ( this.callBackGetDataSuccess ) this.callBackGetDataSuccess(_result);
			}
		}
		catch (e)
		{
			TenkenARdebugException("TenkenARdata.extractData" , e);
		}
	};

	// インターバルタイマーを利用してデータ受信
	this.startIntervalAction = function(_action)
	{
		this.dataNextCount=0;
		if ( "get" == _action )
		{
			this.setIntervalFunc(this.getArDataInterval.bind(this));
		}
		else if ( "post" == _action )
		{
			this.setIntervalFunc(this.postArDataInterval.bind(this));
		}
		else if ( "delete" == _action )
		{
			this.setIntervalFunc(this.deleteArDataInterval.bind(this));
		}
	}

	// データカウント数・成功コールバック
	this.getArDataCountSuccess2 = function(_result)
	{
		try
		{
			if ( _result && null != _result.getValue() )
			{
				var result=_result.getValue();

				// 受信するデータ数を保存
				if ( 0 < this.getMaxCount && this.getMaxCount < result.unlimitedRecordCount )
				{
					// 受信上限数が設定されている場合は上限数までに制限
					this.dataMaxCount=this.getMaxCount;
				}
				else
				{
					// 受信上限数が設定されていない、または結果件数が上限以下の場合には結果件数を設定
					this.dataMaxCount=result.unlimitedRecordCount;
				}

				this.dataCount=0;

				if ( 0 < this.dataMaxCount  )
				{
					if ( null != this.IntervalTime && 0 < this.IntervalTime )
					{
						// インターバルタイマーを利用して
						// データ受信数を制御します。
						this.startIntervalAction("get");
					}
					else
					{
						// インターバルタイマー利用せずデータ取得
						// 1個目からすべて受信します。
						this.getArDataValue(1, result.unlimitedRecordCount);
					}
				}
				else
				{
					// 対象が0件のため、データ取得を終了します。

					// データ受信後共通終了処理
					this.completeGetData();

					if ( this.callBackGetDataSuccess ) this.callBackGetDataSuccess(_result);
				}
			}
		}
		catch (e)
		{
			TenkenARdebugException("TenkenARdata.getARDataCountSuccess2" , e);
		}
	}

	// データカウント数・失敗コールバック
	this.getArDataCountError2 = function(_result)
	{
		try
		{
			this.result=_result;

			var message = "データカウント数の取得に失敗しました。動作モードとネットワーク状況を確認して再度お試しください。(" + this.tablename + ")\n";
			this.detail="";
			if(_result.getStatus() == "AR_HTTP_EXCEPTION")
			{
				this.detail = _result.getValue().status + " : " + _result.getValue().statusText + "\n" + _result.getValue().responseText;
			} else
			{
				this.detail += _result.getStatus() + "\n"+ _result.getValue();
			}


			this.completeGetData();

			if ( this.callBackGetDataError ) this.callBackGetDataError(_result);
		}
		catch (e)
		{
			TenkenARdebugException("TenkenARdata.getARDataCountError2" , e);
		}
	}


	// データ受信成功コールバック
	this.getArDataSuccess = function(_result)
	{
		if ( null != _result.getValue() )
		{
			//結果から必要なデータを抽出して保存します。
			this.extractData(_result);
		}
	}

	// データ受信失敗コールバック
	this.getArDataError = function(_result)
	{
		try
		{
			this.result=_result;

			var message = "データの取得に失敗しました。動作モードとネットワーク状況を確認して再度お試しください。(" + this.tablename + ")\n";
			this.detail="";
			if(_result.getStatus() == "AR_HTTP_EXCEPTION")
			{
				this.detail = _result.getValue().status + " : " + _result.getValue().statusText + "\n" + _result.getValue().responseText;
			} else
			{
				this.detail += _result.getStatus() + "\n"+ _result.getValue();
			}
			// データ受信後共通終了処理
			this.completeGetData();


			if ( this.callBackGetDataError ) this.callBackGetDataError(_result);
		}
		catch (e)
		{
			TenkenARdebugException("TenkenARdata.getARDataError" , e);
		}
	}


	// データ受信

	// データ受信は、カウント数を取得後１回の最大送受信数(maxLimitRange)分繰り返します。
	// _start : 受信開始カウント:このカウントからthis.maxLimitRangeまで
	//          １回のAR.dat4a.getArServerDataで受信します。
	// _count : 最大受信個数です。
	//          AR.data.getArServerDataは、以下の回数分呼ばれます。
	//          端数切り上げ)
	//            (_count - _start) / this.maxLimitRange

	// _start : 受信開始カウント:
	this.getArDataValue = function(_start, _count)
	{
		try
		{
			// インターバルタイマーから呼ばれた場合は、１回で受信可能な
			// _startと_countが指定されるため、forループは行いません。
			// インタバーバルタイマーを利用しない場合は、this.maxLimitRangeの
			// 数毎にforループして、複数回処理を行います。
			for ( var i=_start ; i <= _count ; i += this.maxLimitRange )
			{
				//検索クエリオブジェクトを作成します。
				var query = new TenkenARvalue.QuadQuery();
				query.type = "RECORDSANDCOUNT";
				// 1の場合は、ENDを指定せず1個のみ受信するように設定
				if ( 1 == this.maxLimitRange )
				{
					query.limitRange = new TenkenARvalue.Range(1);
				}
				else
				{
					query.limitRange = new TenkenARvalue.Range(i, Math.min(i + this.maxLimitRange - 1, _count));
				}
				query.qattributeOrderIndexRange = new TenkenARvalue.Range(1,100);

				//利用者定義データが登録されているqtypeを指定します。
				query.qtypeNameRanges = new Array(new TenkenARvalue.Range(this.tablename));

				// 検索条件指定
				if ( null != this.where )
				{
					query.whereExpressions=this.where;
				}

				// ソート条件指定
				if ( null != this.sort )
				{
					query.sortOrderExpressions=this.sort;
				}

				//文字列に変換します。
				var getQuery = TenkenARvalue.makeQuadQuery(query);

				//AR実行サーバから点検設備データを取得します。
				AR.Data.getArServerData(
					getQuery,
					this.reload,
					this.getArDataSuccess.bind(this),
					this.getArDataError.bind(this)
					);
			}
		}
		catch(e)
		{
			TenkenARdebugException("TenkenARdata.getARDataValue" , e);
		}
	};

	this.getArDataInterval = function()
	{
		try
		{
			if ( this.dataCount >= this.dataMaxCount )
			{
				// 最後まで受信したので終了
				this.stopIntervalAction();

				return;
			}

			if ( this.dataNextCount <= this.dataCount )
			{
				var startCnt = this.dataNextCount;
				if ( ( this.dataMaxCount - this.dataNextCount ) < this.maxLimitRange )
				{
					this.dataNextCount = this.dataMaxCount;
				}
				else
				{
					this.dataNextCount += this.maxLimitRange;
				}

				this.getArDataValue((startCnt + 1), this.dataNextCount);
			}

		}
		catch (e)
		{
			TenkenARdebugException("getArDataInterval" , e);
		}

		return;
	}

	// データ受信は、カウント数を取得後、１回の最大送受信数分繰り返します。
	this.getArData = function(_onSuccess, _onError)
	{
		try
		{
			// 既に通信中の場合は処理を行わない。
			if ( true == this.busy )
			{
				return;
			}
			// 通信中フラグON
			this.busy=true;
			// 送受信完了フラグをfalse(未完了)に設定
			this.complete=false

			this.dataGetValue=null;
			this.dataCount=0;
			this.dataMaxCount=0;
			this.result=null;
			this.status=null;
			this.detail=null;


			this.callBackGetDataSuccess=_onSuccess;
			this.callBackGetDataError=_onError;

			this.getArDataCount(this.getArDataCountSuccess2.bind(this), this.getArDataCountError2.bind(this));
		}
		catch (e)
		{
			TenkenARdebugException("TenkenARdata.getARDataCount" , e);
		}
	}

	// インターバルタイマー開始
	this.setIntervalFunc = function(_funcname)
	{
		try
		{
		// 既に登録されている場合は登録しません。
		if ( null == this.IntervalId && null != _funcname )
		{
			this.IntervalId = setInterval(_funcname, this.IntervalTime);
		}
		}
		catch (e)
		{
			TenkenARdebugException("TenkenARdata.setIntervalFunc" , e);
		}
	}

	// インターバルタイマー停止
	this.stopIntervalAction = function()
	{
		try
		{
		if ( null != this.IntervalId )
		{
			clearInterval(this.IntervalId);
			this.IntervalId = null;
		}
		}
		catch (e)
		{
			TenkenARdebugException("TenkenARdata.stopIntervalAction" , e);
		}
	};

	// データ受信完了後の共通処理
	this.completeGetData = function()
	{
		// 通信中フラグをOFF
		this.busy=false;
		// 送受信完了フラグをtrue(完了)に設定
		this.complete=true;
	}
	// データ送信完了後の共通処理
	this.completePostData = function()
	{
		// 通信中フラグをOFF
		this.busy=false;
		// 送受信完了フラグをtrue(完了)に設定
		this.complete=true;
	}

	// 送信データ追加
	// Quad単位で指定してください。
	this.addPostData = function(_postData)
	{
		if ( null != _postData )
		{
			this.dataPostValue.push(_postData);
		}
	}

	// 送信データクリア
	this.clearPostData = function()
	{
		this.dataPostValue.length=0;
	}

	// 指定された範囲のデータを送信
	this.postArDataValue = function(_start, _count)
	{
		try
		{

		// インターバルタイマーから呼ばれた場合は、１回で送信可能な
		// _startと_countが指定されるため、forループは行いません。
		// インタバーバルタイマーを利用しない場合は、this.maxLimitRangeの
		// 数毎にforループして、複数回処理を行います。
		for ( var i = _start ; i < _count ; i++ )
		{
			if ( null != this.dataPostValue[i] )
			{
				AR.Data.postArServerData(
								"quads",
								this.dataPostValue[i],
								this.postArDataSuccess.bind(this),
								this.postArDataError.bind(this)
				);
			}
		}
		}
		catch (e)
		{
			this.dataSendNGCount++;
			TenkenARdebugException("TenkenARdata.postArDataValue" , e);
		}
	}

	// 送信時インターバルタイマー
	this.postArDataInterval = function()
	{
		try
		{
			if ( 0 < this.dataSendNGCount )
			{
				// 送信が失敗したデータがあるため、送信処理を中断する
				this.stopIntervalAction();

				// データ送信後共通終了処理
				this.completePostData();

				if ( this.callBackPostDataError ) this.callBackPostDataError(this.result);
				return;
			}

			if ( this.dataSendOKCount >= this.dataMaxCount )
			{
				// 最後まで送信したので終了
				this.stopIntervalAction();
				this.dataPostValue.length = 0;

				// データ送信後共通終了処理
				this.completePostData();

				if ( this.callBackPostDataSuccess ) this.callBackPostDataSuccess(this.result);

				return;
			}

			if ( this.dataNextCount <= this.dataSendOKCount )
			{
				var startCnt = this.dataNextCount;
				if ( ( this.dataMaxCount - this.dataNextCount ) < this.maxLimitRangeSend )
				{
					this.dataNextCount = this.dataMaxCount;
				}
				else
				{
					this.dataNextCount += this.maxLimitRangeSend;
				}

				this.postArDataValue(startCnt, this.dataNextCount);
			}
		}
		catch (e)
		{
			TenkenARdebugException("TenkenARdata.postArDataInterval" , e);
			this.stopIntervalAction();
		}

		return;
	}


	// データの送信
	this.postArData = function(_onSuccess, _onError)
	{
		try
		{
			// 既に通信中の場合は処理を行わない。
			if ( true == this.busy )
			{
				return;
			}
			if ( this.dataPostValue.length <= 0 )
			{
				// 送信データがないため処理を行わない。
				// resultがないため、成功コールバックは呼びません。
				return;
			}

			// 通信中フラグON
			this.busy=true;
			// 送受信完了フラグをfalse(未完了)に設定
			this.complete=false

			this.callBackPostDataSuccess=_onSuccess;
			this.callBackPostDataError=_onError;

			this.dataSendOKCount = 0;
			this.dataSendNGCount = 0;
			this.dataNextCount = 0;

			this.dataMaxCount = this.dataPostValue.length;


			if ( null != this.IntervalTime && 0 < this.IntervalTime )
			{
				// タイマーをセットし、その関数内で結果を送信
				this.startIntervalAction("post");
			}
			else
			{
				// インターバルタイマー利用せずデータ送信
				// 1個目からmaxCount数ずつ送信します。
				var countNext=0;
				var countAll=this.dataMaxCount
				for ( var i=0 ; i < countAll ; i += this.maxLimitRangeSend )
				{
					if ( ( countAll - i ) < this.maxLimitRangeSend )
					{
						countNext += ( countAll - i );
					}
					else
					{
						countNext += this.maxLimitRangeSend;
					}

					this.postArDataValue(i, countNext);
				}
			}

		}
		catch(e) {
			alert("データのアップロード中にエラーが発生しました。\n" + e);
			return false;
		}
	}


	// データ送信成功コールバック
	this.postArDataSuccess = function(_result)
	{
		try
		{

			this.dataSendOKCount++;

			if ( this.dataMaxCount <= (this.dataSendOKCount +  this.dataSendNGCount))
			{
				// インターバルタイマーの指定なしの場合は完了処理を行う。
				// 指定ありの場合はインターバルタイマ内で完了処理を行う
				if ( null != this.IntervalTime && this.IntervalTime <= 0 )
				{
					// データ送信後共通終了処理
					this.completePostData();

					if (  0 < this.dataSendNGCount )
					{
						if ( this.callBackPostDataError ) this.callBackPostDataError(this.result);
					}

					else
					{
						if ( this.callBackPostDataSuccess ) this.callBackPostDataSuccess(_result);
					}
				}
			}
		}
		catch (e)
		{
			TenkenARdebugException("TenkenARdata.postArDataSuccess" , e);
		}
	};

	// データ送信失敗コールバック
	this.postArDataError = function(_result)
	{
		try
		{

			// タイマーをクリア
			this.stopIntervalAction();

			var message = "データのアップロードに失敗しました。動作モードとネットワーク状況を確認して再度お試しください。";
			var detail="";
			var strCount = ":count=" + this.dataMaxCount + "," + this.dataNextCount + "," + this.dataSendOKCount + "," + this.dataSendNGCount;

			if(_result.getStatus() == "AR_HTTP_EXCEPTION"){
				detail = _result.getValue().status + " : " + _result.getValue().statusText + "\n" + _result.getValue().responseText + strCount;
			} else {
				detail += _result.getStatus() + "\n"+ _result.getValue() + strCount;
			}

			this.dataSendNGCount++;
			if ( this.dataNextCount <= (this.dataSendOKCount +  this.dataSendNGCount))
			{
				// データ送信後共通終了処理
				this.completePostData();

				if ( this.callBackPostDataError ) this.callBackPostDataError(_result);
			}
		}
		catch (e)
		{
			TenkenARdebugException("TenkenARdata.postArDataError" , e);
		}
	};

	// 削除データ追加
	// 削除データは、QEntity単位です。
	// (QvalueのQAttribute単位ではないので注意してください)
	//   _deleteData : TenkenARvalue.QDeleteを指定してください。
	this.addDeleteData = function(_deleteData)
	{
		if ( null != _deleteData )
		{
			this.dataDelete.push(_deleteData);
		}
	};

	// 削除データクリア
	this.clearDeleteData = function()
	{
		this.dataDelete.length=0;
	};

    //return data to be deleted
    this.getDeleteData = function(){
        return this.dataDelete;
    };

	// 指定された範囲のデータを削除要求
	this.deleteArDataValue = function(_start, _count)
	{
		try
		{

		for ( var i = _start ; i < _count ; i++ )
		{
			if ( null != this.dataDelete[i] )
			{
				var deleteMsg=this.dataDelete[i];
				var strQuery="qentities/" +  this.tablename + "/" + deleteMsg.qentityid;
				AR.Data.deleteArServerData(
								strQuery,
								deleteMsg.version,
								this.deleteArDataSuccess.bind(this),
								this.deleteArDataError.bind(this)
				);
			}
		}
		}
		catch (e)
		{
			this.dataSendNGCount++;
			TenkenARdebugException("TenkenARdata.deleteArDataValue" , e);
		}
	}

	// 削除時インターバルタイマー
	this.deleteArDataInterval = function()
	{
		try
		{
			if ( 0 < this.dataSendNGCount )
			{
				// 削除が失敗したデータがあるため、削除処理を中断する
				this.stopIntervalAction();

				// データ削除後共通終了処理
				this.completeDeleteData();

				if ( this.callBackDeleteDataError ) this.callBackDeleteDataError(this.result);
				return;
			}

			if ( this.dataSendOKCount >= this.dataMaxCount )
			{
				// 最後まで削除したので終了
				this.stopIntervalAction();
				this.dataDelete.length = 0;

				// データ削除後共通終了処理
				this.completeDeleteData();

				if ( this.callBackDeleteDataSuccess ) this.callBackDeleteDataSuccess(this.result);

				return;
			}

			if ( this.dataNextCount <= this.dataSendOKCount )
			{
				var startCnt = this.dataNextCount;
				if ( ( this.dataMaxCount - this.dataNextCount ) < this.maxLimitRangeSend )
				{
					this.dataNextCount = this.dataMaxCount;
				}
				else
				{
					this.dataNextCount += this.maxLimitRangeSend;
				}

				this.deleteArDataValue(startCnt, this.dataNextCount);
			}
		}
		catch (e)
		{
			TenkenARdebugException("TenkenARdata.deleteArDataInterval" , e);
			this.stopIntervalAction();
		}

		return;
	}

	// データの削除
	this.deleteArData = function(_onSuccess, _onError)
	{
		try
		{
			// 既に通信中の場合は処理を行わない。
			if ( true == this.busy )
			{
				return;
			}
			if ( this.dataDelete.length <= 0 )
			{
				// 削除データがないため処理を行わない。
				return;
			}

			// 通信中フラグON
			this.busy=true;
			// 送受信完了フラグをfalse(未完了)に設定
			this.complete=false

			this.callBackDeleteDataSuccess=_onSuccess;
			this.callBackDeleteDataError=_onError;

			this.dataSendOKCount = 0;
			this.dataSendNGCount = 0;
			this.dataNextCount = 0;

			this.dataMaxCount = this.dataDelete.length;

			if ( null != this.IntervalTime && 0 < this.IntervalTime )
			{
				// タイマーをセットし、その関数内で削除
				this.startIntervalAction("delete");
			}
			else
			{
				// インターバルタイマー利用せずデータ削除
				// 1個目からmaxCount数ずつ削除します。
				var countNext=0;
				var countAll=this.dataMaxCount
				for ( var i=0 ; i < countAll ; i += this.maxLimitRangeSend )
				{
					if ( ( countAll - i ) < this.maxLimitRangeSend )
					{
						countNext += ( countAll - i );
					}
					else
					{
						countNext += this.maxLimitRangeSend;
					}

					this.deleteArDataValue(i, countNext);
				}
			}

		}
		catch(e) {
			alert("データのアップロード中にエラーが発生しました。\n" + e);
			return false;
		}
	}


	// データ削除成功コールバック
	this.deleteArDataSuccess = function(_result)
	{
		try
		{

			this.dataSendOKCount++;

			if ( this.dataMaxCount <= (this.dataSendOKCount +  this.dataSendNGCount))
			{
				// インターバルタイマーの指定なしの場合は完了処理を行う。
				// 指定ありの場合はインターバルタイマ内で完了処理を行う
				if ( null != this.IntervalTime && this.IntervalTime <= 0 )
				{
					// データ削除後共通終了処理
					this.completeDeleteData();

					if (  0 < this.dataSendNGCount )
					{
						if ( this.callBackDeleteDataError ) this.callBackDeleteDataError(this.result);
					}
					else
					{
						if ( this.callBackDeleteDataSuccess ) this.callBackDeleteDataSuccess(_result);
					}
				}
			}
		}
		catch (e)
		{
			TenkenARdebugException("TenkenARdata.deleteArDataSuccess" , e);
		}
	};

	// データ削除失敗コールバック
	this.deleteArDataError = function(_result)
	{
		try
		{

			// タイマーをクリア
			this.stopIntervalAction();

			var message = "データのアップロードに失敗しました。動作モードとネットワーク状況を確認して再度お試しください。";
			var detail="";
			var ErrorStatus=0;

			var strCount = ":count=" + this.dataMaxCount + "," + this.dataNextCount + "," + this.dataSendOKCount + "," + this.dataSendNGCount;

			if(_result.getStatus() == "AR_HTTP_EXCEPTION"){
				detail = _result.getValue().status + " : " + _result.getValue().statusText + "\n" + _result.getValue().responseText + strCount;
				ErrorStatus=_result.getValue().status;
			} else {
				detail += _result.getStatus() + "\n"+ _result.getValue() + strCount;
			}

			// deleteが404 Not Foundになる場合があるため、
			// 404で終了時は正常時と同じ処理を行う。
			if ( 404 == ErrorStatus )
			{
				this.dataSendOKCount++;

				if ( this.dataMaxCount <= (this.dataSendOKCount +  this.dataSendNGCount))
				{
					// データ削除後共通終了処理
					this.completeDeleteData();

					if (  0 < this.dataSendNGCount )
					{
						if ( this.callBackDeleteDataError ) this.callBackDeleteDataError(_result);
					}
					else
					{
						if ( this.callBackDeleteDataSuccess ) this.callBackDeleteDataSuccess(_result);
					}
				}
			}
			else
			{
				this.dataSendNGCount++;
				if ( this.dataNextCount <= (this.dataSendOKCount +  this.dataSendNGCount))
				{
					// データ削除後共通終了処理
					this.completeDeleteData();

					if ( this.callBackDeleteDataError ) this.callBackDeleteDataError(_result);
				}
			}
		}
		catch (e)
		{
			TenkenARdebugException("TenkenARdata.deleteArDataError" , e);
		}
	};

	// データ削除完了後の共通処理
	this.completeDeleteData = function()
	{
		// 通信中フラグをOFF
		this.busy=false;
		// 送受信完了フラグをtrue(完了)に設定
		this.complete=true;
	};

    this.extractHttpData = function(data){
        try {
            var recordCount = data.length;
            for (var recordIndex = 0; recordIndex < recordCount; recordIndex++) {
                //レコードを一つずつ調べます。
                var record = data[recordIndex];
                var valueLength = record.qvalues.length;
                var value = new Object();

                value.version = record.version;
                value.qentityId = record.id;

                //使用するqvalueの数だけ取得します。attributeNameで判断します。
                for (var valueIndex = 0; valueIndex < valueLength; valueIndex++) {

                    var qvalue = record.qvalues[valueIndex];
                    if (null != qvalue.stringValue) {
                        value[qvalue.qattributeName] = qvalue.stringValue;
                    }
                    else if (null != qvalue.longValue) {
                        value[qvalue.qattributeName] = qvalue.longValue;
                    }
                    else if (null != qvalue.floatValue) {
                        value[qvalue.qattributeName] = qvalue.floatValue;
                    }
                }

                // データ保存
                if (null == this.dataGetValue) this.dataGetValue = new Array();
                this.dataGetValue.push(value);
            }
        }
        catch (e)
        {
            TenkenARdebugException("TenkenARdata.extractHttpData" , e);
        }
    };
}
