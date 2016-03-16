/**
 * @overview 点検業務向けJavaScript API群(データ管理)です。
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

var TenkenData = {};

//============================================================================
// 共有部品定義
//============================================================================

// 強制読み込みモード設定
TenkenData.setSuperReloadMode = function(_mode)
{
	// 強制制読み込みモード
	Tenken.config.SuperReload=_mode;
}
// 強制読み込みモード取得
TenkenData.getSuperReloadMode = function()
{
	return(Tenken.config.SuperReload);
}

//============================================================================
// シナリオのデータ管理
//============================================================================

// データ管理クラス(シナリオ)
TenkenData.Scenario = {};

// AR実行サーバのデータ送受信用TenkenARdata作成
TenkenData.Scenario.arScenario=new TenkenARdata(TenkenConst.TableName.scenario);
// データ管理領域(シナリオ)
TenkenData.Scenario.ListAll = [];

// 選択中シナリオ名
TenkenData.Scenario.ScenarioName = null;

// 取得したデータをTenkenDataの管理用データに加工してコピーします。
TenkenData.Scenario.createDataList = function()
{
	try
	{
		if ( null == TenkenData.Scenario.arScenario ) return;

		var datas = TenkenData.Scenario.arScenario.getDataValue();
		if ( null == datas ) return;
		if ( null == TenkenData.Scenario.ListAll ) return;

		var countList=datas.length;
		for ( var i=0 ; i < countList ; i++ )
		{
			var dataValue = datas[i];
			if ( null != dataValue )
			{
				var newObj=new Object();
				// 対象のシナリオかチェック
				if ( dataValue.ar_description )
				{
					if ( -1 == dataValue.ar_description.indexOf("#tenken#")  )
					{
						// 対象外のシナリオのため、次のシナリオにスキップする
						continue;
					}
				}
				else
				{
					// 備考に記載が無いシナリオは、対象外のシナリオのため、
					// 次のシナリオにスキップする
					continue;
				}

				// 全データをコピー(QAttribute単位の処理)
				for ( var name in dataValue )
				{
					switch ( name )
					{
					case "ar_name":
						newObj.name=dataValue[name];
						break
					case "ar_description":
						newObj.description=dataValue[name];
						break
					case "ar_id":
						newObj.scenarioId=dataValue[name];
						break
					default:
						newObj[name]=dataValue[name];
						break;
					}
				}

				TenkenData.Scenario.ListAll.push(newObj);
			}
		}
	}
	catch(e)
	{
		alert("Exception : TenkenData.Scenario.createDataList\n" + e);
	}
}

// データの取得成功時のコールバック（シナリオ)
TenkenData.Scenario.cbDataSuccessScenario = function(_result)
{
	try
	{
		// 取得したデータをコピーする。
		TenkenData.Scenario.ListAll.length = 0;
		TenkenData.Scenario.createDataList();

		if ( TenkenData.Scenario.ListAll.length <= 0 )
		{
			TenkenData.AllGet.abortInvalidData(null, null, null, "シナリオが登録されていないか、点検システムの対象となるシナリオが存在しませんでした。\n点検システム用のシナリオを登録してください。", null);
			return;
		}
    }
    catch (e)
    {
        alert("Exception : cbDataSuccessScenario\n" + e);
        return;
    }

    TenkenData.AllGet.saveStorageScenario()
        .then(function(){
            // シナリオデータが完了した場合、作業者選択画面の作業者リストと
            // (登録されていれば)ダウンロード完了通知用コールバックを呼び出す
            var elm = document.getElementById("selectScenarioId");

            if ( null != TenkenData.AllGet.downloadScenarioSuccessFunc )
            {
                TenkenData.AllGet.downloadScenarioSuccessFunc();
            }
        })
        .fail(function(e){alert("Exception : cbDataSuccessScenario\n" + e);});
}

// データの取得失敗時のコールバック（シナリオ)
TenkenData.Scenario.cbDataErrorScenario = function(_result)
{
	var message = "AR実行サーバのデータ取得(シナリオ)に失敗しました。動作モードとネットワーク状況を確認して再度お試しください。";
	var detail="";
	if(_result.getStatus() == "AR_HTTP_EXCEPTION")
	{
		detail = _result.getValue().status + " : " + _result.getValue().statusText + "\n" + _result.getValue().responseText;
	} else
	{
		detail += _result.getStatus() + "\n"+ _result.getValue();
	}
	Tenken.Util.logerr("GET_DATA_RESPONSE:ERROR:Scenario:" + message , detail);

	if ( null != TenkenData.AllGet.downloadScenarioErrorFunc )
	{
		// 一度しか呼び出さないようにするためコールバックをクリアする
		var func=TenkenData.AllGet.downloadScenarioErrorFunc;
		TenkenData.AllGet.downloadScenarioErrorFunc=null;
		func(detail);
	}
}

// AR実行サーバからデータの取得を行います。(シナリオ)
TenkenData.Scenario.getScenario = function()
{
	try
	{
		if ( null == TenkenData.Scenario.arScenario )
		{
			TenkenData.Scenario.arScenario=new TenkenARdata(TenkenConst.TableName.scenario);
		}
		if ( TenkenData.Scenario.arScenario.getBusyStatus() == true )
		{
			alert("通信中です。\nしばらく時間をおいてから再度実行してください。");
			return;
		}

		// 強制読み込みモード設定
		TenkenData.Scenario.arScenario.setReload(TenkenData.getSuperReloadMode());

		// 検索条件:なし
		// 検索条件を初期化
		TenkenData.Scenario.arScenario.clearWhere();

		// ソート条件:シナリオID
		// ソート条件を初期化
		TenkenData.Scenario.arScenario.clearSort();
		// ソート方向に昇順を設定
		TenkenData.Scenario.arScenario.setSortDesc(false);
		// ソート条件１：シーンID
		// FAST 18/08/2015 – no longer specifying a sort range
		TenkenData.Scenario.arScenario.addSort("ar_id", null, null, null, "LONG");


		// データ取得
		TenkenData.Scenario.arScenario.getArData(TenkenData.Scenario.cbDataSuccessScenario, TenkenData.Scenario.cbDataErrorScenario);
	}
	catch (e)
	{
		alert("Exception: getScenario\n" + e);
	}
}

// ローカルストレージにデータを保存(シナリオ)
TenkenData.Scenario.saveStorage = function()
{
    var promises = [Tenken.Storage.ScenarioList.set(JSON.stringify(TenkenData.Scenario.ListAll))];

	if ( null != TenkenData.Scenario.ScenarioName )
    {
        promises.push(Tenken.Storage.ScenarioName.set(JSON.stringify(TenkenData.Scenario.ScenarioName)));
	}
    return Q.all(promises)
};

// ローカルストレージからデータをロード(シナリオ)
TenkenData.Scenario.loadStorage = function() {

    var data = Tenken.Storage.ScenarioList.get();
    if (null != data) {
        var tmplist = JSON.parse(data);
        if (null != tmplist) {
            TenkenData.Scenario.ListAll = tmplist;
        }
        else {
            TenkenData.Scenario.ListAll.length = 0;
        }
    } else {
        TenkenData.Scenario.ListAll.length = 0;
    }
    data = Tenken.Storage.ScenarioName.get();
    if(null != data) {
        tmplist = JSON.stringify(data);
        if (null != tmplist) {
            TenkenData.Scenario.ScenarioName = tmplist;
        } else {
            TenkenData.Scenario.ScenarioName = null;
        }
    } else {
        TenkenData.Scenario.ScenarioName = null;
    }
    return Q.when();
};


// 作業中のシナリオ名設定
TenkenData.Scenario.setScenarioName = function(_nameScenario)
{
	TenkenData.Scenario.ScenarioName=_nameScenario;
};

// 作業中のシナリオ名取得
TenkenData.Scenario.getScenarioName = function()
{
	return(TenkenData.Scenario.ScenarioName);
};

// シナリオIDからシナリオ名取得します。
TenkenData.Scenario.getScenarioNameFromId = function(_id)
{
	var nameScenario = null;

	if ( !_id || _id <=0 )
	{
		// 無効なシナリオID、または全対象(=0)のためnullで復帰
        return Q.when(null);
	}

    return Q.when(null == TenkenData.Scenario.ListAll || 0 == TenkenData.Scenario.ListAll.length)
        .then(function(result){
            // シナリオデータが無い場合は、
            // シナリオデータをローカルストレージから取得する
            if (result){
                return TenkenData.Scenario.loadStorage()
            } else {
                Q.when();
            }
        })
        .then(function(){
            if ( null == TenkenData.Scenario.ListAll || 0 == TenkenData.Scenario.ListAll.length ) {
                return Q.when(null);
            } else {
                // シナリオリストから検索
                var lenScenaio=TenkenData.Scenario.ListAll.length;
                for ( var i=0 ; i < lenScenaio; i++ )
                {
                    if ( _id == TenkenData.Scenario.ListAll[i].scenarioId )
                    {
                        nameScenario=TenkenData.Scenario.ListAll[i].name;
                        break;
                    }
                }
                return Q.when(nameScenario);
            }
        });
};

// 指定されたselectタグのElementにダウンロードしたシナリオデータを
// 選択肢として追加します。
TenkenData.Scenario.selectScenarioNameHTML = function(_select)
{
	if ( _select )
	{
        TenkenData.Scenario.loadStorage()
            .then(function(){
                var lenScenario = TenkenData.Scenario.ListAll.length;
                if ( 0 < lenScenario )
                {
                    _select.length=(lenScenario + 1);
                    _select.options[0].text="選んでください";
                    for ( var i = 0 ; i < lenScenario ; i++ )
                    {
                        _select.options[i+1].text=TenkenData.Scenario.ListAll[i].name;
                        _select.options[i+1].value=TenkenData.Scenario.ListAll[i].scenarioId;
                    }
                }
                else
                {
                    _select.length=2;
                    _select.options[0].text="選んでください";
                    _select.options[1].text="(ダウンロードしてください)";
                    _select.options[0].value="";
                    _select.options[1].value="";
                }
            })
            .fail(function(e){alert("Exception : TenkenData.Scenario.selectScenarioNameHTML\n"+e )});
	}
};

//============================================================================
// シーンのデータ管理
//============================================================================

// データ管理クラス(シーン)
TenkenData.Scene = {};

// AR実行サーバのデータ送受信用TenkenARdata作成
TenkenData.Scene.arScene=new TenkenARdata(TenkenConst.TableName.scene);

// データ管理領域(シーン)
TenkenData.Scene.ListAll = [];

// ダウンロードしたシーン名リスト保存用
TenkenData.Scene.SceneNames = null;

// 取得したデータをTenkenDataの管理用データに加工してコピーします。
TenkenData.Scene.createDataList = function()
{
	try
	{
		if ( null == TenkenData.Scene.arScene ) return;

		var datas = TenkenData.Scene.arScene.getDataValue();
		if ( null == datas ) return;
		if ( null == TenkenData.Scene.ListAll ) return;

		var countList=datas.length;
		for ( var i=0 ; i < countList ; i++ )
		{
			var dataValue = datas[i];
			if ( null != dataValue )
			{
				var newObj=new Object();
				// 全データをコピー(QAttribute単位の処理)
				for ( var name in dataValue )
				{
					switch ( name )
					{
					case "ar_name":
						newObj.name=dataValue[name];
						break
					case "ar_description":
						newObj.description=dataValue[name];
						break
					case "ar_id":
						newObj.sceneid=dataValue[name];
						break
					default:
						newObj[name]=dataValue[name];
						break;
					}
				}

				if ( null == TenkenData.Scene.SceneNames )
				{
					TenkenData.Scene.SceneNames = new Object();
				}

				// シーン名保存
				TenkenData.Scene.SceneNames[newObj.sceneid]=newObj.name;

				// 申し送り表示、設備名表示を表示するシーンか判定。
				// 説明(ar_description)に以下の文字列が定義されている場合は
				// それぞれの表示対象シーンです。(大文字小文字区別あり)
				//
				//   #MSG#   : 申し送り
				//   #TENKEN# : 設備名表示
				//
				if ( newObj.description )
				{
					if ( 0 <= newObj.description.indexOf("#MSG#") )
					{
						newObj.dispMSG=true;
					}
					if ( 0 <= newObj.description.indexOf("#TENKEN#") )
					{
						newObj.dispASSET=true;
					}
				}

				TenkenData.Scene.ListAll.push(newObj);
			}
		}
	}
	catch(e)
	{
		alert("Exception : TenkenData.Scene.createDataList \n" + e);
	}
};

// ローカルストレージにデータを保存(シーン)
TenkenData.Scene.saveStorage = function()
{
    var promises = [Tenken.Storage.SceneList.set(JSON.stringify(TenkenData.Scene.ListAll))];

	if ( null !=TenkenData.Scene.SceneNames )
	{
		promises.push(Tenken.Storage.SceneNames.set(JSON.stringify(TenkenData.Scene.SceneNames)));
	}
    return Q.all(promises);
};

// ローカルストレージからデータをロード(シーン)
TenkenData.Scene.loadStorage = function()
{
    return Q.all([Tenken.Storage.SceneList.get(),
        Tenken.Storage.SceneNames.get()
    ]).spread(function(list, name){
        if(null != list){
            var tmplist = JSON.parse(list);
            if ( null != tmplist ) {
                TenkenData.Scene.ListAll = tmplist;
            } else {
                TenkenData.Scene.ListAll.length = 0;
            }
            tmplist = JSON.parse(name);
            if ( null != tmplist ) {
                TenkenData.Scene.SceneNames = tmplist;
            } else {
                TenkenData.Scene.SceneNames = null;
            }
        } else {
            TenkenData.Scene.ListAll.length = 0;
            TenkenData.Scene.SceneNames = null;
        }
        return Q.when();
    });

};

// シーン名の取得
TenkenData.Scene.getSceneName = function(_sceneid)
{
	if ( null != TenkenData.Scene.SceneNames && null != TenkenData.Scene.SceneNames[_sceneid] )
	{
		return(TenkenData.Scene.SceneNames[_sceneid]);
	}
	return null;
};


//============================================================================
// AR重畳表示定義データの管理
//============================================================================

// データ管理クラス(AR重畳表示定義データ)
TenkenData.SuperimposedGraphic = {};

// AR実行サーバのデータ送受信用TenkenARdata作成
TenkenData.SuperimposedGraphic.arSuperimposedGraphic=new TenkenARdata(TenkenConst.TableName.SuperimposedGraphic);

// データ管理領域(AR重畳表示定義データ) Object型で使用
TenkenData.SuperimposedGraphic.objSuperimposedGraphics=null;

// 指定されたシナリオID、シーンID、マーカーID保存用
TenkenData.SuperimposedGraphic.setSecenarioId = -1;
TenkenData.SuperimposedGraphic.setSceneId = -1;
TenkenData.SuperimposedGraphic.setMarkerId = -1;

// 取得したデータをTenkenDataの管理用データに加工してコピーします。
TenkenData.SuperimposedGraphic.createDataList = function()
{
	try {
	if ( null == TenkenData.SuperimposedGraphic.arSuperimposedGraphic ) return;

		var contents=null;
		var datas = TenkenData.SuperimposedGraphic.arSuperimposedGraphic.getDataValue();
		if ( null == datas ) return;
		var countList=datas.length;
		for ( var i=0 ; i < countList ; i++ )
		{
			var sd=datas[i];
			if ( null != sd )
			{
				//AR重畳表示定義のシーンID、マーカーID、AR重畳表示定義データ
				//がnullでないことを確認
				var value=new Object();
				if(sd.arsen_sceneid != null && sd.armk_markerid != null)
				{
					if ( null == contents ) contents = new Object();
					var sceneId=sd.arsen_sceneid;
					var markerId=sd.armk_markerid

					var value=new Object();
					// JSON文字列のAR重畳表示定義データをオブジェクトに変換
					if ( null != sd.arpoi_superimposedgraphic )
					{
						value = AR.Renderer.parseSuperimposedGraphic(sd.arpoi_superimposedgraphic);
					}

					if( null == contents[sceneId]) contents[sceneId] = new Object();
					if( null == contents[sceneId][markerId])
					{
						contents[sceneId][markerId] = new Array(value);
					}
					else
					{
						contents[sceneId][markerId].push(value);
					}
				}
			}
		}

		//抽出したAR重畳表示定義データをシーンID、マーカーID別に
		//格納します。
		if ( null != contents )
		{
			for(scene in contents)
			{
				if( null == TenkenData.SuperimposedGraphic.objSuperimposedGraphics ) TenkenData.SuperimposedGraphic.objSuperimposedGraphics = new Object();

				if(TenkenData.SuperimposedGraphic.objSuperimposedGraphics[scene] == null)
				{
					TenkenData.SuperimposedGraphic.objSuperimposedGraphics[scene] = contents[scene];
				}
				else
				{
					for(marker in contents[scene])
					{
						TenkenData.SuperimposedGraphic.objSuperimposedGraphics[scene][marker] = contents[scene][marker];
					}
				}
			}
		}

	}
	catch(e)
	{
		alert("Exception : TenkenData.SuperimposedGraphic.createDataList\n" + e);
	}
};

// ローカルストレージにデータを保存(AR重畳表示定義データ)
TenkenData.SuperimposedGraphic.saveStorage = function()
{
	if(TenkenData.SuperimposedGraphic.objSuperimposedGraphics != null)
	{
		return Tenken.Storage.SuperimposedGraphic.set(JSON.stringify(TenkenData.SuperimposedGraphic.objSuperimposedGraphics));
	}
    return Q.when();
};

// ローカルストレージからデータをロード(AR重畳表示定義データ)
TenkenData.SuperimposedGraphic.loadStorage = function()
{
    return Tenken.Storage.SuperimposedGraphic.get()
        .then(function(data){
            if ( null != data )
            {
                TenkenData.SuperimposedGraphic.objSuperimposedGraphics = AR.Renderer.parseSuperimposedGraphic(data);
            }
            else {
                TenkenData.SuperimposedGraphic.objSuperimposedGraphics = null;
            }
            return Q.when();
        });
};

//============================================================================
// 各設備のデータ管理
//============================================================================
// データ管理クラス(設備データ)
TenkenData.Asset = {};

// AR実行サーバのデータ送受信用TenkenARdata作成
TenkenData.Asset.arAsset=new TenkenARdata(TenkenConst.TableName.asset);

// データ管理領域(設備データ)
TenkenData.Asset.ListAll = [];

// 取得したデータをTenkenDataの管理用データに加工してコピーします。
TenkenData.Asset.createDataList = function()
{
	try
	{
		if ( null == TenkenData.Asset.arAsset ) return;

		var datas = TenkenData.Asset.arAsset.getDataValue();
		if ( null == datas ) return;
		if ( null == TenkenData.Asset.ListAll ) return;

		var countList=datas.length;
		for ( var i=0 ; i < countList ; i++ )
		{
			var dataValue = datas[i];
			if ( null != dataValue )
			{
				var newObj=new Object();
				// 全データをコピー(QAttribute単位の処理)
				for ( var name in dataValue )
				{
					switch ( name )
					{
					case "msgICON":
						// 申送追加アイコン情報 
						//	(形式:  "アイコン名;アイコンイメージファイル名")
						if ( null != dataValue[name] )
						{
							var iconInfo = dataValue[name].split(";");
							if ( null == newObj.msgICON ) newObj.msgICON = new Array();
							newObj.msgICON.push(iconInfo);
						}
						break
					case "tenkenICON":
						// 点検入力アイコン情報 
						//	(形式:  "アイコン名;アイコンイメージファイル名")
						if ( null != dataValue[name] )
						{
							var iconInfo = dataValue[name].split(";");
							if ( null == newObj.tenkenICON ) newObj.tenkenICON = new Array();
							newObj.tenkenICON.push(iconInfo);
						}
						break
					case "graphURL":
						// 点検グラフアイコン情報 
						//	(形式:  "アイコン名;グラフURL")
						if ( null != dataValue[name] )
						{
							var iconInfo = dataValue[name].split(";");
							if ( null == newObj.graphURL ) newObj.graphURL = new Array();
							newObj.graphURL.push(iconInfo);
						}
						break
	                case "assetname":
	                        newObj[name]=dataValue[name];
	                        
	                        // Add new item for displaying asset name, add assetid after assetname
	                        newObj["assetnamefordisplay"] = dataValue[name] + '(' + dataValue.assetid + ')';
	                        break;
					default:
						// 追加アイコン情報 
						//	(形式:  "アイコン名;アイコンイメージファイル名;タップ時オープンファイル名")
						if ( null != dataValue[name] && name.substr(0,4) == "icon" )
						{
							var iconInfo = dataValue[name].split(";");
							if ( null == newObj.listICON ) newObj.listICON = new Array();

							newObj.listICON.push(iconInfo);
						}
						else
						{
							newObj[name]=dataValue[name];
						}
						break;
					}
				}

				// 必須項目・重複データのチェック
				TenkenData.Asset.checkData(newObj);

				// 新規追加
				TenkenData.Asset.ListAll.push(newObj);
			}
		}
	}
	catch(e)
	{
		alert("Exception : TenkenData.Asset.createDataList\n" + e);
	}
};

// 受信データの必須データの有無、重複をチェックします。
// データ異常があった場合は、データ定義異常を出力し、
// 初画面に戻ります。
//
// チェック内容
// QAttribute名 : チェック項目
// assetid       : null  重複
// assetname     : null  重複
// markerid      : null  重複
// markername    : null  重複
TenkenData.Asset.checkData = function(_data)
{
	try
	{
		var err=false;
		var errName=null;
		var errValue=null;
		var errMsg=null;

		if ( null == _data ) return;

		// nullチェック(値指定必須で値なし)
		if ( null == _data.assetid )
		{
			err=true;
			errName="assetid";
		}
		else if ( null == _data.assetname )
		{
			err=true;
			errName="assetname";
		}
		else if ( null == _data.markerid )
		{
			err=true;
			errName="markerid";
		}
		else if ( null == _data.markername )
		{
			err=true;
			errName="markername";
		}
		if ( true == err )
		{
			errMsg="必須項目が未定義のデータがあります。";
		}
		else
		{
			// 重複チェック
			var len=TenkenData.Asset.ListAll.length;
			for ( var i = 0 ; i < len ; i++ )
			{
				var ad=TenkenData.Asset.ListAll[i];
				if ( _data.assetid == ad.assetid )
				{
					err=true;
					errName="assetid";
					errValue=_data.assetid;
				}
				
				/*
				 * Allow duplicated assetname, but show assetname with assetid to distinguish between them
				 * 
				 else if ( _data.assetname == ad.assetname )
				{
					err=true;
					errName="assetname";
					errValue=_data.assetname;
				}
				*/
				else if ( _data.markerid == ad.markerid )
				{
					err=true;
					errName="markerid";
					errValue=_data.markerid;
				}
				else if ( _data.markername == ad.markername )
				{
					err=true;
					errName="markername";
					errValue=_data.markername;
				}
			}
			if ( true == err )
			{
				errMsg="重複したデータ定義があります。";
			}
		}

		// データに異常がある場合は、エラーを出力し初画面に戻る
		if ( true == err )
		{
			TenkenData.AllGet.abortInvalidData(TenkenConst.TableName.asset, errName, errValue, null, errMsg);
		}
	}
	catch (e)
	{
		alert("Exception: TenkenData.Asset.checkData\n" + e);
	}
}

// ローカルストレージにデータを保存(設備データ)
TenkenData.Asset.saveStorage = function()
{
	return Tenken.Storage.lastAssetData.set(JSON.stringify(TenkenData.Asset.ListAll));
};

// ローカルストレージからデータをロード(設備データ)
TenkenData.Asset.loadStorage = function()
{

    Tenken.Storage.lastAssetData.get()
        .then(function(data){
            if ( null != data )
            {
                var tmplist = JSON.parse(data);
                if ( null != tmplist )
                {
                    TenkenData.Asset.ListAll = tmplist;
                }
                else
                {
                    TenkenData.Asset.ListAll.length = 0;
                }
            }
            else
            {
                TenkenData.Asset.ListAll.length = 0;
            }
            return Q.when();
        })
        .fail(function(e){alert("Exception : TenkenData.Asset.loadStorage\n" + e)});
};

// 指定assetidから設備データ(Object型)を取得します。
TenkenData.Asset.getDatafromAssetId = function(_assetid)
{
	if ( null == _assetid || "" == _assetid )
	{
		return(null);
	}
	var qvalue=null;
	for ( var i = 0 ; i < TenkenData.Asset.ListAll.length ; i++ )
	{
		if ( _assetid == TenkenData.Asset.ListAll[i].assetid )
		{
			qvalue = TenkenData.Asset.ListAll[i];
			break;
		}
	}
	return(qvalue);
}

// 指定assetidと一致する設備データのマーカーIDを取得します。
TenkenData.Asset.getMarkerIdfromAssetId = function(_assetid)
{
	if ( null == _assetid || "" == _assetid )
	{
		return(null);
	}
	var markerid=-1;
	for ( var i = 0 ; i < TenkenData.Asset.ListAll.length ; i++ )
	{
		if ( _assetid == TenkenData.Asset.ListAll[i].assetid )
		{
			markerid = TenkenData.Asset.ListAll[i].markerid;
			break;
		}
	}
	return(markerid);
}

/**
 * 指定マーカーIDと一致する設備データの設備名を取得します。
 * Note: Returned assetname is for display, the format is "assetname(assetid)"
 * 
 * @param {String} _markerid
 * @return {String} assetname asset name for display
 */ 
TenkenData.Asset.getAssetNamefromMarkerId = function(_markerid)
{
	if ( 0 >= TenkenData.Asset.ListAll.length )
	{
		return(-1);
	}

	var assetname = "";
	for ( var i = 0 ; i < TenkenData.Asset.ListAll.length ; i++ )
	{
		if ( _markerid == TenkenData.Asset.ListAll[i].markerid )
		{
			assetname = TenkenData.Asset.ListAll[i].assetnamefordisplay; // for display
			break;
		}
	}
	return(assetname);
}

// 指定マーカーIDと一致する設備データ(Object型)を取得します。
TenkenData.Asset.getDatafromMarkerId = function(_markerid)
{
	var qvalue=null;
	for ( var i = 0 ; i < TenkenData.Asset.ListAll.length ; i++ )
	{
		if ( _markerid == TenkenData.Asset.ListAll[i].markerid )
		{
			qvalue = TenkenData.Asset.ListAll[i];
			break;
		}
	}
	return(qvalue);
}

// 指定マーカーIDと一致する設備データ(Object型)すべてを配列型で取得します。
TenkenData.Asset.getDataListfromMarkerId = function(_markerid)
{
	var ret = [];
	for ( var i = 0 ; i < TenkenData.Asset.ListAll.length ; i++ )
	{
		if ( _markerid == TenkenData.Asset.ListAll[i].markerid )
		{
			ret.push(TenkenData.Asset.ListAll[i]);
		}
	}
	return(ret);
}


// 指定されたassetidのデータを削除します。
TenkenData.Asset.deleteAsset = function(_assetid)
{
	// 後ろから順に対象のassetid検索して削除します。
	var lenList = TenkenData.Asset.ListAll.length;
	for ( i = (lenList - 1) ; i >= 0 ; i-- )
	{
		if (_assetid == TenkenData.Asset.ListAll[i].assetid )
		{
			TenkenData.Asset.ListAll.splice(i,1);
		}
	}
}


//============================================================================
// 申し送りデータ管理
//============================================================================

// データ管理クラス(申し送りデータ)
TenkenData.MsgEvent = {};

// AR実行サーバのデータ送受信用TenkenARdata作成(今回値と前回値用)
TenkenData.MsgEvent.arMessageEventLast=new TenkenARdata(TenkenConst.TableName.messageevent);
TenkenData.MsgEvent.arMessageEventCurrent=new TenkenARdata(TenkenConst.TableName.messageevent);

// データ管理領域(申し送りデータ)。今回値と前回値用
TenkenData.MsgEvent.Last = [];
TenkenData.MsgEvent.Current = [];

// 取得したデータをTenkenDataの管理用データに加工してコピーします。
TenkenData.MsgEvent.createDataList = function()
{
	// 申し送りデータの構造は変更せず、そのままの構造でコピーする。
	// ただし、申し送りの表示位置が重ならないようにマーカーID単位で
	// 表示位置(X,Y,Z)の座標をずらして再設定する処理を追加する。
	try
	{
		if ( null == TenkenData.MsgEvent.arMessageEventLast || null == TenkenData.MsgEvent.Last ) return;

		var datas = TenkenData.MsgEvent.arMessageEventLast.getDataValue();
		if ( null == datas ) return;

		var countList=datas.length;
		var markerid=-1;
		var MsgList = new Object();
		var saveIndex=0;
		for ( var i=0 ; i < countList ; i++ )
		{
			markerid=-1;
			var dataValue = datas[i];
			if ( null != dataValue )
			{
				var newObj=new Object();

				// 全データをコピー(QAttribute単位の処理)
				for ( var name in dataValue )
				{
					newObj[name]=dataValue[name];
					if ( "markerid" == name )
					{
						markerid=dataValue[name];
					}
				}

				if ( -1 != markerid )
				{
					if ( null == MsgList[markerid] ) MsgList[markerid]= new Array();
			;
					// マーカー単位で申し送りの表示位置を自動設定する際に
					// ソート順が変わってしまうためソート順の順番も保存します。
					newObj.saveIndex=saveIndex++;
					MsgList[markerid].push(newObj);
				}
			}
		}

		// データを登録します。
		// また、マーカーID毎の申し送りデータの表示位置を自動的に変更します。
		// (X=Y=Zが0の場合だけで、値が設定されている場合は、その座標で表示)
		var sX = window.screen.width;
		var sY = window.screen.height;
		sizeX = sX / 5120;
		sizeY = sY / 3200;
		if ( sizeX < 0.2 || sizeX > 1.0 ) sizeX = 0.5;
		if ( sizeY < 0.2 || sizeY > 1.0 ) sizeY = 0.5;
		sizeZ = sizeX;

		// X=0.7固定で、マーカーID毎にY=0.7から-0.2ずつ表示
		var LX=0.7;
		var LY=0.6;
		var LZ=0.0;
		var L_STEP = - 0.2; // 固定
		var index=0;

		for ( var markerid in  MsgList )
		{
			var data=MsgList[markerid];
			var lenMsgData=data.length;
			LZ=0.0;
			index=0;
			for ( var i=0 ; i < lenMsgData ; i++ )
			{
				if ( markerid == data[i].markerid )
				{
					if ( (null == data[i].x || 0 == data[i].x ) &&
						 (null == data[i].y || 0 == data[i].y ) &&
						 (null == data[i].z || 0 == data[i].z ) )
					{
						data[i].x=LX;
						data[i].y=Math.round((LY + (L_STEP * index++)) * 1000) / 1000;
						data[i].z=LZ;
					}
				}
				TenkenData.MsgEvent.Last[data[i].saveIndex]=data[i];
			}
		}
	}
	catch(e)
	{
		alert("Exception : TenkenData.MsgEvent.createDataList\n" + e);
	}
};

// ローカルストレージにデータを保存(申し送りデータ)
TenkenData.MsgEvent.saveStorage = function()
{
    return Q.all([
        Tenken.Storage.currentMessageEventData.set(JSON.stringify(TenkenData.MsgEvent.Current)),
        Tenken.Storage.lastMessageEventData.set(JSON.stringify(TenkenData.MsgEvent.Last))
    ]);
};

// ローカルストレージからデータをロード(申し送りデータ)
TenkenData.MsgEvent.loadStorage = function()
{
    Q.all([
        Tenken.Storage.lastMessageEventData.get(),
        Tenken.Storage.currentMessageEventData.get()
    ])
        .spread(function(last,current){
            if ( null != last )
            {
                var tmplist = JSON.parse(last);
                if ( null != tmplist ) {
                    TenkenData.MsgEvent.Last = tmplist;
                } else {
                    TenkenData.MsgEvent.Last.length = 0;
                }
                tmplist = JSON.parse(current);
                if ( null != tmplist ) {
                    TenkenData.MsgEvent.Current = tmplist;
                } else {
                    TenkenData.MsgEvent.Current.length = 0;
                }
            } else {
                TenkenData.MsgEvent.Last.length = 0;
                TenkenData.MsgEvent.Current.length = 0;
            }
            return Q.when();
        })

};

// カレントの申し送りをクリア
TenkenData.MsgEvent.clearCurrentMsgEvent = function()
{
	TenkenData.MsgEvent.Current.length = 0;
	return Tenken.Storage.currentMessageEventData.remove();
}

// 指定されたマーカーIDと一致する今回値および前回値の申し送りデータ(Object型)
// を配列型で取得します。
TenkenData.MsgEvent.getMsgEventListFromMarkerId = function(_markerid)
{
	// カレントおよびダウンロードした申し送りデータを対象にします。
	var targetList = [];
	if ( 0 < TenkenData.MsgEvent.Current.length )
	{
		targetList.push(TenkenData.MsgEvent.Current);
	}
	if ( 0 < TenkenData.MsgEvent.Last.length )
	{
		targetList.push(TenkenData.MsgEvent.Last);
	}

	var msgeventlist = [];
	for ( var  i= 0 ; i < targetList.length ; i++ )
	{
		var lists = targetList[i];
		if ( null != lists )
		{
			for ( var j = 0 ; j < lists.length ; j++ )
			{
				if ( -1 == _markerid ||
		             _markerid == lists[j].markerid )
				{
					msgeventlist.push(lists[j]);
				}
			}
		}
	}
	return(msgeventlist);
}

// 指定されたassetidと一致する今回値および前回値の申し送りデータ(Object型)
// を配列型で取得します。
TenkenData.MsgEvent.getMsgEventListFromAssetId = function(_assetid)
{
	// カレントおよびダウンロードした申し送りデータを対象にします。
	var targetList = [];
	if ( 0 < TenkenData.MsgEvent.Current.length )
	{
		targetList.push(TenkenData.MsgEvent.Current);
	}
	if ( 0 < TenkenData.MsgEvent.Last.length )
	{
		targetList.push(TenkenData.MsgEvent.Last);
	}

	var msgeventlist = [];
	for ( var  i= 0 ; i < targetList.length ; i++ )
	{
		var lists = targetList[i];
		if ( null != lists )
		{
			for ( var j = 0 ; j < lists.length ; j++ )
			{
				if ( _assetid == lists[j].targetassetid )
				{
					msgeventlist.push(lists[j]);
				}
			}
		}
	}
	return(msgeventlist);
}

// 指定されたmsgidおよびoccurrencetimeと一致する今回値および前回値の
// 申し送りデータ(Object型)を配列型で取得します。
// msgidはユニークで運用するため、複数あった場合も１個目に見つかったもの
// を返します。
TenkenData.MsgEvent.getMsgEventFromMsgIdTime = function(_msgid,_occurrencetime)
{

	// カレントおよびダウンロードした申し送りデータを対象にします。
	var targetList = [];
	if ( 0 < TenkenData.MsgEvent.Current.length )
	{
		targetList.push(TenkenData.MsgEvent.Current);
	}
	if ( 0 < TenkenData.MsgEvent.Last.length )
	{
		targetList.push(TenkenData.MsgEvent.Last);
	}

	var msgevent = null;

	for ( i = 0 ; null == msgevent  && i < targetList.length ; i++ )
	{
		var lists = targetList[i];

		for ( var j = 0 ; j < lists.length ; j++ )
		{
			if ( -1 == _msgid ||
	             (_msgid == lists[j].msgid &&
	              _occurrencetime == lists[j].occurrencetime))
			{
				msgevent = lists[j];
				break;
			}
		}
	}
	return(msgevent);
}

// 指定されたmsgidの申し送りデータを返します。(カレント）
TenkenData.MsgEvent.getMsgEventFromMsgIdCurrent = function(_msgid)
{
	var msgevent = null;

	var lenList = TenkenData.MsgEvent.Current.length;
	for ( i = 0 ; i < lenList ; i++ )
	{
		if (_msgid == TenkenData.MsgEvent.Current[i].msgid )
		{
			msgevent=TenkenData.MsgEvent.Current[i];
			break;
		}
	}

	return(msgevent);
}

// 指定されたmsgidの申し送りデータを返します。（過去の申し送り)
TenkenData.MsgEvent.getMsgEventFromMsgIdLast = function(_msgid)
{
	var msgevent = null;

	var lenList = TenkenData.MsgEvent.Last.length;
	for ( i = 0 ; i < lenList ; i++ )
	{
		if (_msgid == TenkenData.MsgEvent.Last[i].msgid )
		{
			msgevent=TenkenData.MsgEvent.Last[i];
			break;
		}
	}

	return(msgevent);
}

// 指定されたmsgidの申し送りデータを削除します。(カレント)
TenkenData.MsgEvent.deleteMsgEventCurrent = function(_msgid)
{
	// 後ろから順に対象のmsgidを削除します。(カレント)
	var lenList = TenkenData.MsgEvent.Current.length;
	for ( i = (lenList - 1) ; i >= 0 ; i-- )
	{
		if (_msgid == TenkenData.MsgEvent.Current[i].msgid )
		{
			TenkenData.MsgEvent.Current.splice(i,1);
		}
	}
}

// Enable="true"以外の申し送りデータを削除します。(Lastのみ)
TenkenData.MsgEvent.deleteMsgEventDisable = function()
{
	// 後ろから順に検索・削除します。
	var lenList = TenkenData.MsgEvent.Last.length;
	for ( i = (lenList - 1) ; i >= 0 ; i-- )
	{
		if ("true" != TenkenData.MsgEvent.Last[i].Enable )
		{
			TenkenData.MsgEvent.Last.splice(i,1);
		}
	}
}

// 申し送りデータ(カレント)を追加します
TenkenData.MsgEvent.addCurrentMsgEvent = function(_msg)
{
	try {
		var MsgEvent=new Object();

		MsgEvent.version = _msg.version;
		MsgEvent.qentityId = _msg.qentityId;
		MsgEvent.msgid = _msg.msgid;
		MsgEvent.msgname = _msg.msgname;
		MsgEvent.description = _msg.description;
		MsgEvent.registrationtime = _msg.registrationtime;
		if ( null != _msg.registrationtime ) MsgEvent.regDatetimeStr =  new Tenken.DatetimeValue(_msg.registrationtime).toStringFullTime();
		MsgEvent.registrant = _msg.registrant;
		MsgEvent.markerid = _msg.markerid;
		MsgEvent.markername = _msg.markername;
		MsgEvent.x = _msg.x;
		MsgEvent.y = _msg.y;
		MsgEvent.z = _msg.z;
		MsgEvent.targetassetid = _msg.targetassetid;
		MsgEvent.title = _msg.title;
		MsgEvent.level = _msg.level;
		MsgEvent.value = _msg.value;
		MsgEvent.occurrencetime = _msg.occurrencetime;
		if ( null != _msg.occurrencetime ) MsgEvent.occDatetimeStr =  new Tenken.DatetimeValue(_msg.occurrencetime).toStringFullTime();
		MsgEvent.operator = _msg.operator;
		MsgEvent.ScenarioId = _msg.ScenarioId;
		if ( null != _msg.Enable ) MsgEvent.Enable = _msg.Enable;
		if ( null != _msg.Answer ) MsgEvent.Answer =  _msg.Answer;

		// 追加
//		TenkenData.MsgEvent.Current.push(MsgEvent);
		TenkenData.MsgEvent.Current.unshift(MsgEvent);
		return(MsgEvent);
	}
	catch (e)
	{
		alert("Exception : TenkenData.MsgEvent.addCurrentMsgEvent\n" + e);
	}
}


// 申し送りのCurrentからLastへ移動する
TenkenData.MsgEvent.moveCurrentDataToLastData = function()
{
	// カレントの申し送りすべてをLastリストに移動する
	for ( var  i=TenkenData.MsgEvent.Current.length - 1 ; 0 <= i ; i-- )
	{
		if ( null != TenkenData.MsgEvent.Current[i]  )
		{
			// 先頭から加えていく
			TenkenData.MsgEvent.Last.unshift(TenkenData.MsgEvent.Current[i]);
		}
	}

	// カレントの申し送りをクリア
	TenkenData.MsgEvent.clearCurrentMsgEvent();

	// 移動した申し送りをローカルストレージに保存
	TenkenData.MsgEvent.saveStorage();
}


//============================================================================
// 点検データ管理
//============================================================================
// 点検結果データは、各設備の各点検項目の最新の値のみ(各項目最新１レコード分)
// 前回値としてダウンロードします。
// 今回値は、点検している端末内のローカルストレージ内のローカルデータを使用
// します。今回値は、ダウンロード直後は値なしの状態です。
// 点検データ取得は、設備毎にデータ取得必要なため、TenkenARDataを利用せず
// 直接ARからデータを取得しています。

// データ管理クラス(点検結果データ)
TenkenData.TenkenEvent = {};

// AR実行サーバのデータ送受信用TenkenARdata作成
TenkenData.TenkenEvent.arTenkenEventCurrent=new TenkenARdata(TenkenConst.TableName.tenkenevent);

// データ管理領域(点検結果データ)。今回値と前回値用。
TenkenData.TenkenEvent.Last = [];
TenkenData.TenkenEvent.Current = [];

// データ取得中状態フラグ
TenkenData.TenkenEvent.getphase = false;

// データ取得時のインターバルタイマーID
TenkenData.TenkenEvent.IntervalTenkenEventId = null;

// 点検結果データをクリアします。(今回値のみ)
TenkenData.TenkenEvent.clearCurrentTenkenEvent = function()
{
	TenkenData.TenkenEvent.Current.length = 0;
	return Tenken.Storage.currentTenkenEventData.remove();
}

// 指定マーカーIDと一致する点検結果データの値を初期化します。(今回値のみ)
TenkenData.TenkenEvent.resetCurrentTenkenEventTable = function(_markerid)
{
	// カレントおよびダウンロードした点検結果データを対象にします。
	for ( var i = 0 ; i < TenkenData.TenkenEvent.Current.length ; i++ )
	{
		var tenkendata=TenkenData.TenkenEvent.Current[i];
		if ( _markerid == tenkendata.markerid )
		{
			// 初期化します
			// 変更が無い設備データなどはそのまま利用します。
			// (description,type,markerid,markername,targetassetid,assetstatus)
			tenkendata.tenkenid=null;
			tenkendata.tenkenname=null;
			tenkendata.registrationtime=null;
			tenkendata.registrant=null;
			tenkendata.occurrencetime=null;
			tenkendata.operator=null;
			tenkendata.F01=null;
			tenkendata.F02=null;
			tenkendata.F03=null;
			tenkendata.F04=null;
			tenkendata.F05=null;
			tenkendata.S01=null;
			tenkendata.S02=null;
			tenkendata.S03=null;
			tenkendata.S04=null;
			tenkendata.S05=null;
		}
	}

	return;
}


// 指定されたassetid、TenkenType、DataEntryNameに一致する
// 点検結果データ(Object型)を取得します。

TenkenData.TenkenEvent.getData = function(_targetList, _targetassetid, _tenkentype, _dataentryname)
{
	var tenken = null;

	for ( i = 0 ; i < _targetList.length ; i++ )
	{
		var lists = _targetList[i];
		if ( null == lists ) continue;

		for ( var j = 0 ; j < lists.length ; j++ )
		{
			var tmptenken = lists[j];

			if ( tmptenken.type == _tenkentype &&
				(null == _targetassetid ||
				 "" == _targetassetid ||
 				 tmptenken.targetassetid == _targetassetid) &&
				( null == _dataentryname || tmptenken[_dataentryname] != null) )
			{
				if ( null == tenken || (tmptenken.occurrencetime > tenken.occurrencetime))
				{
						tenken = tmptenken;
				}
			}
		}
	}

	return tenken;
}

// 取得したデータをTenkenDataの管理用データに加工してコピーします。
TenkenData.TenkenEvent.createData = function(_targetList, _update, _tenken)
{
	try
	{
		var newData=true;
		for ( i = 0 ; i < _targetList.length ; i++ )
		{
			var tmptenken = _targetList[i];
			if ( null == tmptenken ) continue;

			if ( tmptenken.type == _tenken.type &&
				 tmptenken.targetassetid == _tenken.targetassetid &&
				 true == _update )
			{
				var value=tmptenken;
				newData=false;
			}
		}

		if ( true == newData )
		{
			var value =new Object();
		}
		value.version=_tenken.version;
		value.qentityId =_tenken.qentityId;
		value.tenkenid=_tenken.tenkenid;
		value.tenkenname=_tenken.tenkenname;
		value.description=_tenken.description;
		value.type=_tenken.type;
		value.registrationtime=_tenken.registrationtime;
		if ( null != value.registrationtime )
		{
			value.regDatetimeStr =  new Tenken.DatetimeValue(value.registrationtime).toStringFullTime();
		}
		value.registrant=_tenken.registrant;
		value.markerid=_tenken.markerid;
		value.markername=_tenken.markername;
		value.targetassetid=_tenken.targetassetid;
		value.assetstatus=_tenken.assetstatus;
		value.occurrencetime=_tenken.occurrencetime;
		if ( null != value.occurrencetime )
		{
			value.occDatetimeStr =  new Tenken.DatetimeValue(value.occurrencetime).toStringFullTime();
		}
		value.operator=_tenken.operator;
		value.ScenarioId=_tenken.ScenarioId;

		if ( true == newData )
		{
			_targetList.push(value);
		}

	}
	catch (e)
	{
		alert("Exception : TenkenData.TenkenEvent.createData\n" + e);
	}
	return(value);
}

// ローカルストレージにデータを保存(点検結果データ)
TenkenData.TenkenEvent.saveStorage = function()
{
    var promises = [];
    if (0 < TenkenData.TenkenEvent.Last.length) {
        promises.push(Tenken.Storage.lastTenkenEventData.set(JSON.stringify(TenkenData.TenkenEvent.Last)));
    }
    if (0 < TenkenData.TenkenEvent.Current.length) {
        promises.push(Tenken.Storage.currentTenkenEventData.set(JSON.stringify(TenkenData.TenkenEvent.Current)));
    }
    return Q.all(promises)
};

// ローカルストレージからデータをロード(点検結果データ)
TenkenData.TenkenEvent.loadStorage = function()
{
    return Q.all([
        Tenken.Storage.lastTenkenEventData.get(),
        Tenken.Storage.currentTenkenEventData.get()
    ])
        .spread(function(last, current){
            if ( null != last ) {
                var tmplist = JSON.parse(last);
                if (null != tmplist) {
                    TenkenData.TenkenEvent.Last = tmplist;
                } else {
                    TenkenData.TenkenEvent.Last.length = 0;
                }
            } else {
                TenkenData.TenkenEvent.Last.length = 0;
            }
            if ( null != current) {
                var tmplist = JSON.parse(current);
                if ( null != tmplist ) {
                    TenkenData.TenkenEvent.Current = tmplist;
                } else {
                    TenkenData.TenkenEvent.Current.length = 0;
                }
            } else {
                TenkenData.TenkenEvent.Current.length = 0;
            }
            return Q.when();
        });
};

// 今回値の点検結果データすべてを前回値へコピーする。
TenkenData.TenkenEvent.copyCurrentDataFromLastData = function()
{
	var rowFunc = function(_table, _group, _row, _poi2, _valueEntryName, _value, _assetstatus)
	{
		// 点検結果の前回値を今回値に自動設定する
		// ただし、SetLastDataの値がない、またはtrue以外設定されている場合、
        // およびPOIが存在しない場合は、設定しない。
		if ( null == _row.SetLastData ||
            "true" !=_row.SetLastData.toLowerCase() ||
				null == _poi2 )  return;

		// カレント(今回値)POI2の登録または設定
		var tmpPOI2=TenkenData.TenkenEvent.getData(TenkenData.TenkenEvent.Current, _row.AssetId, _row.TenkenType, null);
		if ( tmpPOI2 )
		{
			currentPoi2=tmpPOI2;
		}
		else
		{
			// 新規登録
			var value =new Object();
			value.version=_poi2.version;
			value.qentityId=_poi2.qentityId;
			value.tenkenid=_poi2.tenkenid;
			value.tenkenname=_poi2.tenkenname;
			value.Description=_poi2.Description;
			value.type=_poi2.type;
			value.registrationtime=null;
			value.registrant=null;
			value.markerid=_poi2.markerid;
			value.markername=_poi2.markername;
			value.targetassetid=_poi2.targetassetid;
			value.assetstatus=_poi2.assetstatus;
			value.occurrencetime=null;
			value.operator=null;
			value.ScenarioId=_poi2.ScenarioId;

			var currentPoi2=TenkenData.TenkenEvent.createData(
				TenkenData.TenkenEvent.Current, true, value);

		}
		if ( currentPoi2 ) currentPoi2[_valueEntryName] = _poi2[_valueEntryName];
	}
	TenkenData.TenkenTable.foreachTables(TenkenData.TenkenEvent.Last, null, null, rowFunc);
}

// 指定されたtableidが含まれる点検結果データの値を初期化します。
TenkenData.TenkenEvent.resetCurrentTenkenEventTableTableId = function(_tabledid)
{


	// 1. TenkenTable.TableIdと_tableidが一致するassetidのリストを作成
	var listAssetId=new Object();
	var rowFunc = function(_table, _group, _row, _poi2, _valueEntryName, _value, _assetstatus)
	{
		if ( _table && _row && _tabledid == _table.TableId)
		{
			listAssetId[_row.AssetId] = _row.AssetId;
		}
	}

	TenkenData.TenkenTable.foreachTables(null, null, null, rowFunc);

	// 2. assetidのリストからasset.assetidと一致するmarkeridのリストを作成
	var listMarkerIds=new Object();
	var markerid=-1;
	for ( var assetid in listAssetId )
	{
		markerid=TenkenData.Asset.getMarkerIdfromAssetId(assetid);
		if ( 0 <= markerid )
		{
			listMarkerIds[markerid]=markerid;
		}
	}

	// 3. markeridのリストでカレントの点検結果の値を初期化する。
	for ( var markerid in listMarkerIds )
	{
		TenkenData.TenkenEvent.resetCurrentTenkenEventTable(markerid);
	}

}

//============================================================================
// 作業者名のデータ管理
//============================================================================

// データ管理クラス(作業者データ)
TenkenData.UserData = {};

// AR実行サーバのデータ送受信用TenkenARdata作成
TenkenData.UserData.arUserData=new TenkenARdata(TenkenConst.TableName.userdata);
// データ管理領域(作業者データ)
TenkenData.UserData.ListAll = [];

// 取得したデータをTenkenDataの管理用データに加工してコピーします。
TenkenData.UserData.createDataList = function()
{
	try
	{
		if ( null == TenkenData.UserData.arUserData ) return;

		var datas = TenkenData.UserData.arUserData.getDataValue();
		if ( null == datas ) return;
		if ( null == TenkenData.UserData.ListAll ) return;

		var countList=datas.length;
		for ( var i=0 ; i < countList ; i++ )
		{
			var dataValue = datas[i];
			if ( null != dataValue )
			{
				var newObj=new Object();
				if ( null != dataValue )
				{
					// 全データをコピー(QAttribute単位の処理)
					for ( var name in dataValue )
					{
						newObj[name]=dataValue[name];
					}
					// 必須項目・重複データのチェック
					TenkenData.UserData.checkData(newObj);

					// 新規追加
					TenkenData.UserData.ListAll.push(newObj);
				}
			}
		}
	}
	catch(e)
	{
		alert("Exception : TenkenData.UserData.createDataList \n" + e);
	}
};

// 受信データの必須データの有無、重複をチェックします。
// データ異常があった場合は、データ定義異常を出力し、
// 初画面に戻ります。
//
// チェック内容
// QAttribute名 : チェック項目
// userid       : null  重複
// username     : null  重複
// ScenarioId   : null
TenkenData.UserData.checkData = function(_data)
{
	try
	{
		var err=false;
		var errName=null;
		var errValue=null;
		var errMsg=null;

		if ( null == _data ) return;

		// nullチェック(値指定必須で値なし)
		if ( null == _data.userid )
		{
			err=true;
			errName="userid";
		}
		else if ( null == _data.username )
		{
			err=true;
			errName="username";
		}
		else if ( null == _data.ScenarioId )
		{
			err=true;
			errName="ScenarioId";
		}
		if ( true == err )
		{
			errMsg="必須項目が未定義のデータがあります。";
		}
		else
		{
			// 重複チェック
			var len=TenkenData.UserData.ListAll.length;
			for ( var i = 0 ; i < len ; i++ )
			{
				var ud=TenkenData.UserData.ListAll[i];
				if ( _data.userid == ud.userid )
				{
					err=true;
					errName="userid";
					errValue=_data.userid;
				}
				else if ( _data.username == ud.username )
				{
					err=true;
					errName="username";
					errValue=_data.username;
				}
			}
			if ( true == err )
			{
				errMsg="重複したデータ定義があります。";
			}
		}

		// データに異常がある場合は、エラーを出力し初画面に戻る
		if ( true == err )
		{
			TenkenData.AllGet.abortInvalidData(TenkenConst.TableName.userdata, errName, errValue, null, errMsg);
		}
	}
	catch (e)
	{
		alert("Exception: TenkenData.UserData.checkData\n" + e);
	}
}

// ローカルストレージにデータを保存(作業者データ)
TenkenData.UserData.saveStorage = function()
{
	return Tenken.Storage.UserData.set(JSON.stringify(TenkenData.UserData.ListAll));
};

// ローカルストレージからデータをロード(作業者データ)
TenkenData.UserData.loadStorage = function()
{
    return Tenken.Storage.UserData.get()
        .then(function(data){
            if ( null != data )
            {
                var tmplist = JSON.parse(data);
                if ( null != tmplist ) {
                    TenkenData.UserData.ListAll = tmplist;
                } else {
                    TenkenData.UserData.ListAll.length = 0;
                }
            } else {
                TenkenData.UserData.ListAll.length = 0;
            }
            return Q.when();
        })
        .fail(function(e){alert("Exception : TenkenData.UserData.loadStorage\n" + e)});
};

// ダウンロードした作業者の一覧をHTMLのselectタグのoptionタグ形式で組み立てます
TenkenData.UserData.getUserNameHTML = function()
{
    return TenkenData.UserData.loadStorage()
        .then(function(){
            var str = '';

            for ( var i = 0 ; i < TenkenData.UserData.ListAll.length ; i++ )
            {
                str += '<option value="' + TenkenData.UserData.ListAll[i].username + '">' + TenkenData.UserData.ListAll[i].username;
            }

            if ( 0 >= TenkenData.UserData.ListAll.length )
            {
                str += '<option value="">(ダウンロードしてください)'
            }

            return Q.when(str);
        });
};

// 指定されたselectタグのElementにダウンロードした作業者データを
// 選択肢として追加します。
TenkenData.UserData.selectUserNameHTML = function(_select)
{
	if ( _select )
	{
        return TenkenData.UserData.loadStorage()
            .then(function(){
                if ( 0 < TenkenData.UserData.ListAll.length )
                {
                    _select.length=(TenkenData.UserData.ListAll.length + 1);
                    _select.options[0].text="選んでください";
                    for ( var i = 0 ; i < TenkenData.UserData.ListAll.length ; i++ )
                    {
                        _select.options[i+1].text=TenkenData.UserData.ListAll[i].username;
                        _select.options[i+1].value=TenkenData.UserData.ListAll[i].username;
                    }

                }
                else
                {
                    _select.length=2;
                    _select.options[0].text="選んでください";
                    _select.options[1].text="(ダウンロードしてください)";
                    _select.options[0].value="";
                    _select.options[1].value="";
                }
                return Q.when();
            });
	} else {
        return Q.when();
    }
};

//============================================================================
// 点検項目テーブルのデータ管理
//============================================================================

// データ管理クラス(点検項目データ)
TenkenData.TenkenTable = {};

// AR実行サーバのデータ送受信用TenkenARdata作成
TenkenData.TenkenTable.arTenkenTable=new TenkenARdata(TenkenConst.TableName.tenkentable);

// データ管理領域(点検項目データ)
TenkenData.TenkenTable.ListTables = [];

// 指定されたテーブルIDと一致する点検項目データ(Object型)を取得します。
TenkenData.TenkenTable.getTable = function(_tableid)
{
	try {
		if ( null == _tableid)
		{
			return(null);
		}
		for ( var i = 0 ; i < TenkenData.TenkenTable.ListTables.length ; i++ )
		{
			var table=TenkenData.TenkenTable.ListTables[i];
			if ( _tableid == table.TableId )
			{
				return(table);
			}
		}
		return(null);
	}
	catch (e)
	{
		alert("Exception : TenkenData.TenkenTable.getTable\n" + e);
	}
}

// 指定されたテーブルIDおよびグループIDと一致する
// 点検項目データ(Object型)を取得します。
TenkenData.TenkenTable.getRowGroup = function(_tableid, _rowgroupid)
{
	try{
		if ( null == _tableid )
		{
			return(null);
		}
		for ( var i = 0 ; i < TenkenData.TenkenTable.ListTables.length ; i++ )
		{
			var table=TenkenData.TenkenTable.ListTables[i];
			if ( _tableid == table.TableId )
			{
				for ( var j = 0 ; j < table.listRowGroups.length ; j++ )
				{
					var rowgroup=table.listRowGroups[j];
					if ( _rowgroupid == rowgroup.RowGroupId )
					{
						return(rowgroup);
					}
				}
			}
		}
		return(null);
	}
	catch (e)
	{
		alert("Exception : TenkenData.TenkenTable.getRowGroup\n" + e);
	}
}

// 指定されたテーブルID、グループID、RowID全てと一致する
// 点検項目データ(Object型)を取得します。
TenkenData.TenkenTable.getRow = function(_tableid, _rowgroupid, _rowid)
{
	try {
		if ( null == _tableid || null == _rowid )
		{
			return(null);
		}
		for ( var i = 0 ; i < TenkenData.TenkenTable.ListTables.length ; i++ )
		{
			var table=TenkenData.TenkenTable.ListTables[i];
			if ( _tableid == table.TableId )
			{
				if ( null != _rowgroupid )
				{
					// RowGroupに値が指定されている場合は、RowGroupから検索
					for ( var j = 0 ; j < table.listRowGroups.length ; j++ )
					{
						var rowgroup=table.listRowGroups[j];
						if ( _rowgroupid == rowgroup.RowGroupId )
						{
							for ( var k = 0 ; k < rowgroup.listRows.length ; k++ )
							{
								var row=trowgroup.listRows[k];
								if ( _rowid == row.RowId )
								{
									return(row);
								}
							}
						}
					}
				}
				else
				{
					// RowGroupに値が指定されていない場合は、Tableから検索
					for ( var j = 0 ; j < table.listRowsTable.length ; j++ )
					{
						var row=table.listRowsTable[j];
						if ( _rowid == row.RowId )
						{
							return(row);
						}
					}
				}
			}
		}
		return(null);
	}
	catch (e)
	{
		alert("Exception : TenkenData.TenkenTable.getRow\n" + e);
	}
}

// 指定されたテーブルリスト(配列)の中でグループIDと一致する
// 点検項目データのグループデータ(配列)を取得します。
TenkenData.TenkenTable.getRowGroupFromTable = function(_table, _rowgroupid)
{
	try {
		if ( null == _table || null == _rowgroupid )
		{
			return(null);
		}
		for ( var i = 0 ; i < _table.listRowGroups.length ; i++ )
		{
			var rowgroup=_table.listRowGroups[i];
			if ( _rowgroupid == rowgroup.RowGroupId )
			{
				return(rowgroup);
			}
		}
		return(null);
	}
	catch (e)
	{
		alert("Exception : TenkenData.TenkenTable.getRowGroupFromTable\n" + e);
	}
}

// 指定されたグループリスト(配列)の中でRowIdと一致する
// 点検項目データの点検項目Row(Object型)を取得します。
TenkenData.TenkenTable.getRowFromRowGroup = function(_rowgroup, _rowid)
{
	try {
		if ( null == _rowgroup || null == _rowid )
		{
			return(null);
		}
		for ( var i = 0 ; i < _rowgroup.listRows.length ; i++ )
		{
			var row=_rowgroup.listRows[i];
			if ( _rowid == row.RowId )
			{
				return(row);
			}
		}
		return(null);
	}
	catch (e)
	{
		alert("Exception : TenkenData.TenkenTable.getRowFromRowGroup\n" + e);
	}
}

// 指定されたテーブルリスト(配列)の中でRowIdと一致する
// 点検項目データの点検項目Row(Object型)を取得します。
TenkenData.TenkenTable.getRowFromTable = function(_table, _rowid)
{
	try {
		if ( null == _table || null == _rowid )
		{
			return(null);
		}
		for ( var i = 0 ; i < _table.listRowsTable.length ; i++ )
		{
			var row=_table.listRowsTable[i];
			if ( _rowid == row.RowId )
			{
				return(row);
			}
		}
		return(null);
	}
	catch (e)
	{
		alert("Exception : TenkenData.TenkenTable.getRowFromTable\n" + e);
	}
}

// 指定されたRowIdと一致する点検項目データの
// 点検項目Row(Object型)を取得します。
TenkenData.TenkenTable.getRowFromRowId = function(_rowid)
{
	try {
		if ( null == _rowid )
		{
			return(null);
		}
		for ( var i=0 ; i < TenkenData.TenkenTable.ListTables.length ; i++ )
		{
			var table=TenkenData.TenkenTable.ListTables[i];

			// グループ設定あり。グループ内から検索
			if ( null != table.listRowGroups &&  0 < table.listRowGroups.length )
			{
				// グループ設定あり
				for ( var j=0 ; j < table.listRowGroups.length ; j++ )
				{
					var group=table.listRowGroups[j];
					// 点検項目(Row)表示
					for ( var k=0 ; k < group.listRows.length ; k++ )
					{
						var row=group.listRows[k];
						if ( _rowid ==  row.RowId ) return(row);
					}

				}
			}

			// グループ設定なしの項目からも検索。
			for ( var k=0 ; k < table.listRowsTable.length ; k++ )
			{
				var row=table.listRowsTable[k];
				if ( _rowid ==  row.RowId ) return(row);
			}
		}

		return(null);
	}
	catch (e)
	{
		alert("Exception : TenkenData.getRowFromRowId\n" + e);
	}
}

// 指定されたassetidが含まれるtableidを取得します。
// １つのTableIdで複数のAssetIdを持つことがあるため、
// Row単位で検索します。
TenkenData.TenkenTable.getTableIdFromAssetId = function(_assetid)
{
	var tableid=null;

	var rowFunc = function(_table, _group, _row, _poi2, _valueEntryName, _value, _assetstatus) 
	{
		// 既にtableidが見つかっている場合は即復帰
		if ( null != tableid ) return;
		if ( _row )
		{
			if ( _assetid == _row.AssetId )
			{
				tableid=_table.TableId;
			}
		}
	}

	TenkenData.TenkenTable.foreachTables(TenkenData.TenkenEvent.Last, null, null, rowFunc);

	return tableid;
}

// ローカルストレージにデータを保存(点検項目データ)
TenkenData.TenkenTable.saveStorage = function()
{
	return Tenken.Storage.TenkenTable.set(JSON.stringify(TenkenData.TenkenTable.ListTables));
};

// ローカルストレージからデータをロード(点検項目データ)
TenkenData.TenkenTable.loadStorage = function()
{

    return Tenken.Storage.TenkenTable.get()
        .then(function(data){
            if ( null != data )
            {
                var tmplist = JSON.parse(data);
                if ( null != tmplist )
                {
                    TenkenData.TenkenTable.ListTables = tmplist;
                }
                else
                {
                    TenkenData.TenkenTable.ListTables.length = 0;
                }
            }
            else
            {
                TenkenData.TenkenTable.ListTables.length = 0;
            }
            return Q.when();
        });
};

// 点検項目データ配列の各要素(テーブル、グループ、点検項目)毎に
// 指定されたメソッドを呼び出すforeach定義
TenkenData.TenkenTable.foreachTables = function(_targetlist, _tableFunc, _rowGroupFunc, _rowFunc)
{
    var d = Q.defer();
	try
	{
		var lenTable=TenkenData.TenkenTable.ListTables.length;
		for(var i = 0; i < lenTable ; i++)
		{
			var table = TenkenData.TenkenTable.ListTables[i];
			if(null != _tableFunc ) _tableFunc(true, table);

			if ( null != table.listRowGroups )
			{
				// グループがある場合
				var lenRowGroups=table.listRowGroups.length;
				for(var j = 0; j < lenRowGroups; j++)
				{
					var rowGroup = table.listRowGroups[j];
					if(null != _rowGroupFunc ) _rowGroupFunc(true, table, rowGroup);
					var lenRows=rowGroup.listRows.length;
					for(var k = 0; k < lenRows; k++)
					{
						var row = rowGroup.listRows[k];
						if(null != _rowFunc)
						{
							// TenkenData.TenkenEvent.Current
							// TenkenData.TenkenEvent.Last
							var poi2 = null;
							if ( null != _targetlist )
							{
								poi2 = TenkenData.TenkenEvent.getData([_targetlist], row.AssetId, row.TenkenType, /*row.DataEntryName*/ null);
							}

							var value = ( null == poi2 ) ? null : poi2[row.DataEntryName];
							var assetstatus = ( null == poi2 ) ? null : poi2.assetstatus;
							_rowFunc(	table,
										rowGroup,
										row,
										poi2,
										row.DataEntryName,
										value,
										assetstatus);
						}
					}
					if(null != _rowGroupFunc) _rowGroupFunc(false, table, rowGroup);
				}
			}
			if ( null != table.listRowsTable )
			{
				// グループが無い場合
				var lenRowsTable=table.listRowsTable.length;
				for(var k = 0; k < lenRowsTable ; k++)
				{
					var row = table.listRowsTable[k];
					if(null != _rowFunc)
					{
							var poi2 = null;
							if ( null != _targetlist )
							{
								poi2 = TenkenData.TenkenEvent.getData([_targetlist], row.AssetId, row.TenkenType, /*row.DataEntryName*/ null);
							}
						var value = ( null == poi2 ) ? null : poi2[row.DataEntryName];
						var assetstatus = ( null == poi2 ) ? null : poi2.assetstatus;
						_rowFunc(	table,
									null,
									row,
									poi2,
									row.DataEntryName,
									value,
									assetstatus);
					}
				}
			}
			if(null != _tableFunc) _tableFunc(false, table);
		}
        d.resolve();
	}
	catch (e)
	{
		alert("Exception : TenkenData.TenkenTable.foreachTables\n" + e);
        d.reject(e);
	}
    return d.promise;
};

// 点検結果取得時に利用するテーブル名と点検設備名一覧を作成する
TenkenData.TenkenTable.getTenkenTargetList = function()
{
	try
	{
		var tenkenTargetlist = [];

		for(var i = 0; i < TenkenData.TenkenTable.ListTables.length; i++)
		{
			var table = TenkenData.TenkenTable.ListTables[i];

			if ( null != table.listRowGroups )
			{
				// グループがある場合
				for(var j = 0; j < table.listRowGroups.length; j++)
				{
					var rowGroup = table.listRowGroups[j];
					for(var k = 0; k < rowGroup.listRows.length; k++)
					{
						var row = rowGroup.listRows[k];
						var value = new Object();
						value.table=table.TableId;
						value.type=row.TenkenType;
						value.assetid=row.AssetId;
						var found=0;
						for(var l = 0; l < tenkenTargetlist.length; l++)
						{
							var setvalue=tenkenTargetlist[l];
							if (setvalue.table == table.TableId &&
								setvalue.type == row.TenkenType &&
								setvalue.assetid == row.AssetId )
							{
								found=1;
								break;
							}
						}
						if ( 0 == found )
						{
							tenkenTargetlist.push(value);
						}
					}
				}
			}
			if ( null != table.listRowsTable )
			{
				// グループが無い場合
				for(var k = 0; k < table.listRowsTable.length; k++)
				{
					var row = table.listRowsTable[k];
						var value = new Object();
						value.table=table.TableId;
						value.type=row.TenkenType;
						value.assetid=row.AssetId;
						var found=0;
						for(var l = 0; l < tenkenTargetlist.length; l++)
						{
							var setvalue=tenkenTargetlist[l];
							if (setvalue.table == table.TableId &&
								setvalue.type == row.TenkenType &&
								setvalue.assetid == row.AssetId )
							{
								found=1;
								break;
							}
						}
						if ( 0 == found )
						{
							tenkenTargetlist.push(value);
						}
				}
			}
		}

	}
	catch (e)
	{
		alert("Exception : TenkenData.TenkenTable.getTenkenTargetList\n" + e);
	}

	return(tenkenTargetlist);
};

// 指定された点検項目(Object型)をTenkenDataの管理用データに加工して
// コピーします。
TenkenData.TenkenTable.createListTenkenTable = function(_value)
{
	try {
		var tmptable=TenkenData.TenkenTable.getTable(_value.TableId);

		if ( null == tmptable )
		{
			// 新規作成
			var table=new Object();
			table.listRowGroups=[];
			// RowGroupがnullの場合は、Table直下にRowリストを作成する
			// ここでは、無条件で作成する
			table.listRowsTable=[];

			table.TableId=_value.TableId;
			table.TableName=_value.TableName;
			table.SortIndexOfTable=_value.SortIndexOfTable;
			table.AssetStatusStoppable=_value.AssetStatusStoppable;
			table.ScenarioId=_value.ScenarioId;

			TenkenData.TenkenTable.ListTables.push(table);
		}
		else
		{
			// 既存テーブルを利用(値は上書きせず、最初の値を採用する)
			// 既存値との矛盾チェックをする場合は、ここに追加
			var table=tmptable;
		}

		// RowGroupリストの作成
		if (  null != table && _value.RowGroupId )
		{
		var tmpgroup=TenkenData.TenkenTable.getRowGroupFromTable(table, _value.RowGroupId);
			if ( null == tmpgroup )
			{
				var rowgroup=new Object();
				rowgroup.listRows=[];
				rowgroup.RowGroupId=_value.RowGroupId;
				rowgroup.RowGroupName=_value.RowGroupName;
				rowgroup.SortIndexOfRowGroup=_value.SortIndexOfRowGroup;

				rowgroup.ScenarioId=_value.ScenarioId;

				table.listRowGroups.push(rowgroup);
			}
			else
			{
				var rowgroup=tmpgroup;
			}
		}

		// 上限値と下限値の設定範囲をチェックします。
		var checkFloatLimit = function(_dataname, _value) 
		{
			if ( null != _value )
			{
				//数値ならARのFLOAT範囲(-9999999～9999999)の値かチェック
				if ( _value < -9999999 || 9999999 < _value )
				{
					TenkenData.AllGet.abortInvalidData(TenkenConst.TableName.tenkentable, _dataname, _value, null, "ARのFLOAT値範囲外の値が指定されました。\n-9999999～9999999の範囲で指定してください。");
				}
			}
		}

		// Rowリストの作成
		if ( null != _value.RowId && null != table )
		{
			// RowGroupIdが設定されている場合は、RowGroupにRowを作成
			if ( null != _value.RowGroupId && null != rowgroup)
			{
				var tmprow=TenkenData.TenkenTable.getRowFromRowGroup(rowgroup, _value.RowId);
				if ( null == tmprow )
				{
					var row=new Object();

					// Rowには、テーブル、グループの情報も保存する
					for ( dataname in _value )
					{
						// LimitValueで始まるQAttribute名の場合には上下限値と
						// 基準値を保存する
						// LimitHigh,LimitLow,LimitBase以外の２個目以上を定義する
						// 場合に定義します。
						if ( null != _value[dataname] && dataname.substr(0,10) == "LimitValue" )
						{
							// 追加(2個目以降)の下限値、上限値、基礎値情報 (形式 :  下限値;上限値;基礎値)
							var limitInfoTmp = _value[dataname].split(";");
							var limitInfo = new Array(3);
							// 下限値
							limitInfo[0]=(Tenken.isNumber(limitInfoTmp[0]) == true) ? parseFloat(limitInfoTmp[0]) : null;
							// 上限値
							limitInfo[1]=(Tenken.isNumber(limitInfoTmp[1]) == true) ? parseFloat(limitInfoTmp[1]) : null;
							// 基礎値または基礎RowId
							limitInfo[2] = limitInfoTmp[2];
							if ( null == row.listLimit ) row.listLimit = new Array();

							checkFloatLimit(dataname, limitInfo[0]);
							checkFloatLimit(dataname, limitInfo[1]);
							if( true == Tenken.isNumber(limitInfoTmp[2]) )
							{
								checkFloatLimit(dataname, limitInfo[2]);
							}

							// 新規追加
							row.listLimit.push(limitInfo);
						}
						else
						{
							// 新規追加
							row[dataname] = _value[dataname];
						}
					}

					rowgroup.listRows.push(row);
				}
				else
				{
					TenkenData.AllGet.abortInvalidData(TenkenConst.TableName.tenkentable, "RowId", _value.RowId, null, "グループに同じ点検項目ID(RowId)が存在します。");
				}
			}
			else
			{
				// RowGroupIdがnullの場合は、Table直下にRowを作成する。
				var tmprow=TenkenData.TenkenTable.getRowFromTable(table, _value.RowId);
				if ( null == tmprow )
				{
					var row=new Object();

					// Rowには、テーブル、グループの情報も保存する
					for ( dataname in _value )
					{
						// LimitValueで始まるQAttribute名の場合には上下限値と
						// 基準値を保存する
						// LimitHigh,LimitLow,LimitBase以外の２個目以上を定義する
						// 場合に定義します。
						if ( null != _value[dataname] && dataname.substr(0,10) == "LimitValue" )
						{
							// 追加(2個目以降)の下限値、上限値、基礎値情報 (形式 :  下限値;上限値;基礎値)
							var limitInfoTmp = _value[dataname].split(";");
							var limitInfo = new Array(3);
							// 下限値
							limitInfo[0]=(Tenken.isNumber(limitInfoTmp[0]) == true) ? parseFloat(limitInfoTmp[0]) : null;
							// 上限値
							limitInfo[1]=(Tenken.isNumber(limitInfoTmp[1]) == true) ? parseFloat(limitInfoTmp[1]) : null;
							// 基礎値または基礎RowId
							limitInfo[2] = limitInfoTmp[2];

							checkFloatLimit(dataname, limitInfo[0]);
							checkFloatLimit(dataname, limitInfo[1]);
							if( true == Tenken.isNumber(limitInfoTmp[2]) )
							{
								checkFloatLimit(dataname, limitInfo[2]);
							}


							if ( null == row.listLimit ) row.listLimit = new Array();
							row.listLimit.push(limitInfo);
						}
						else
						{
							row[dataname] = _value[dataname];
						}
					}

					table.listRowsTable.push(row);
				}
				else
				{
					TenkenData.AllGet.abortInvalidData(TenkenConst.TableName.tenkentable, "RowId", _value.RowId, null, "テーブルに同じ点検項目ID(RowId)が存在します。");
				}
			}
		}
	}
	catch(e)
	{
		alert("Exception : TenkenData.TenkenTable.createListTenkenTable\n" + e);
	}
}

// 受信データの必須データの有無、指定誤りをチェックします。
// データ異常があった場合は、データ定義異常を出力し、
// 初画面に戻ります。
//
// チェック内容
// QAttribute名 : チェック項目
// TableId              : null
// TableName            : null
// RowId                : null
// RowName              : null
// RowGoupName          : null (RowGroupIdに値が指定されている場合のみ)
// ValueType            : null
// AssetId              : null
// TenkenType           : null
// DataEntryName        : null
// ScenarioId           : null
// 以下は必須チェックは行わず、指定なしはデフォルト動作を行う
// AssetStatusStoppable : 指定無し時はtrue指定扱い
// SetLastData          : 指定無し時はfalse指定扱い
TenkenData.TenkenTable.checkData = function(_data)
{
	try
	{
		var err=false;
		var errName=null;
		var errValue=null;
		var errMsg=null;

		if ( null == _data ) return;

		var funcCheck=function(_name)
		{
			if ( null == _data[_name] )
			{
				err=true;
				errName=_name;
			}
		}

		if ( false == err ) funcCheck("TableId");
		if ( false == err ) funcCheck("TableName");
		if ( false == err ) funcCheck("RowId");
		if ( false == err ) funcCheck("RowName");
		if ( false == err ) funcCheck("AssetId");
		if ( false == err ) funcCheck("TenkenType");
		if ( false == err ) funcCheck("DataEntryName");
		if ( false == err ) funcCheck("ScenarioId");
		if ( null != _data.RowGroupId )
		{
			if ( false == err ) funcCheck("RowGroupName");
		}
		if ( false == err ) funcCheck("ValueType");

		if ( true == err )
		{
			errMsg="必須項目が未定義のデータがあります。";
		}
		else
		{
			// 指定誤りのチェック
			if ( null != _data.ValueType )
			{
				switch(_data.ValueType)
				{
					case "NUMBER":
						// 正常指定
						// DataEntryNameに数値型の名前が指定されているかチェック
						if ( _data.DataEntryName != "F01" &&
							 _data.DataEntryName != "F02" &&
							 _data.DataEntryName != "F03" &&
							 _data.DataEntryName != "F04" &&
							 _data.DataEntryName != "F05" )
						{
							err=true;
							errName="DataEntryName";
							errValue=_data.DataEntryName;
							errMsg=_data.ValueType + "型のDataEntryNameがF01～F05ではありませんでした。\n";
						}
						break;
					case "WEATHER":
					case "OKNG":
					case "STRING":
					case "MARUBATSU":
						// 正常指定
						// DataEntryNameに数値型の名前が指定されているかチェック
						if ( _data.DataEntryName != "S01" &&
							 _data.DataEntryName != "S02" &&
							 _data.DataEntryName != "S03" &&
							 _data.DataEntryName != "S04" &&
							 _data.DataEntryName != "S05" )
						{
							err=true;
							errName="DataEntryName";
							errValue=_data.DataEntryName;
							errMsg=_data.ValueType + "型のDataEntryNameがS01～S05ではありませんでした。\n";
						}
						break;
					default:
						err=true;
						errName="ValueType";
						errValue=_data.ValueType;
						errMsg="指定したタイプは利用できません。";
						break;
				}
			}
		}

		// データに異常がある場合は、エラーを出力し初画面に戻る
		if ( true == err )
		{
			TenkenData.AllGet.abortInvalidData(TenkenConst.TableName.tenkentable, errName, errValue, null, errMsg);
		}
	}
	catch (e)
	{
		alert("Exception: TenkenData.TenkenTable.checkData\n" + e);
	}
}

// 取得したデータをTenkenDataの管理用データに加工してコピーします。
TenkenData.TenkenTable.createDataList = function()
{
	try {
		if ( null == TenkenData.TenkenTable.arTenkenTable || null == TenkenData.TenkenTable.ListTables ) return;

		var datas = TenkenData.TenkenTable.arTenkenTable.getDataValue();
		if ( null == datas ) return;
		var countList=datas.length;
		for ( var i=0 ; i < countList ; i++ )
		{
			var dataValue=datas[i];
			if ( null != dataValue )
			{
				// Disableに"true"が設定されていた場合には、無効な項目のため、
				// 点検項目から除外して、次ぎの項目へ。
				if ( null != dataValue.Disable && "true" == dataValue.Disable.toLowerCase() )
				{
					continue;
				}

				// 必須項目データのチェック
				TenkenData.TenkenTable.checkData(dataValue);

				TenkenData.TenkenTable.createListTenkenTable(dataValue);
			}
		}
	}
	catch(e)
	{
		alert("Exception : TenkenData.TenkenTable.createDataList\n" + e);
	}
}

//============================================================================
// 全受信データの管理
//============================================================================

// データ管理クラス(全受信データ管理)
TenkenData.AllGet = function() {};

// シナリオのコールバック保存
TenkenData.AllGet.downloadScenarioSuccessFunc=null;
TenkenData.AllGet.downloadScenarioErrorFunc=null;

// 全データのコールバック保存（シナリオ以外受信時）
TenkenData.AllGet.downloadSuccessFunc=null;
TenkenData.AllGet.downloadErrorFunc=null;

// abort中を判定するフラグ
TenkenData.AllGet.abortON=false;

// ダウンロード中か確認する
TenkenData.AllGet.getPhase = function()
{
	// abort中の場合には、ダウンロード中でも完了状態を返す
	if ( true == TenkenData.AllGet.abortON )
	{
		// データ未受信または受信完了
		return(false);
	}

	// シナリオと点検結果(tenkenevent)以外を確認する
	if ( TenkenData.httpRequest.getBusyStatus() == true )
	{
		// データ受信中
		return(true);
	}
	else
	{
		// データ未受信または受信完了
		return(false);
	}
}

// ダウンロード中か確認する。(シナリオデータのみ)
TenkenData.AllGet.getPhaseScenario = function()
{
	if (null != TenkenData.Scenario.arScenario && TenkenData.Scenario.arScenario.getBusyStatus() == true )
	{
		return(true);
	}
	else
	{
		return(false);
	}
}

// 全データ(シナリオと点検結果以外)をダウンロード
TenkenData.AllGet.download = function(_mode, _downloadSuccess, _downloadError)
{
    Tenken.timingData["AllGet.download prepare"].end = new Date();
    Tenken.timingData["TenkenData.AllGet.download"] = {start: new Date()};

	Tenken.Util.loginfo("GET_ALL_DATA1:START");

	// 全ダウンロード後に呼ばれるコールバックを保存
	TenkenData.AllGet.downloadSuccessFunc=_downloadSuccess;
	TenkenData.AllGet.downloadErrorFunc=_downloadError;

	// 強制モード設定
	var mode=( false == _mode ) ? false : true;
	TenkenData.setSuperReloadMode(mode);

    //get server URL
    Tenken.Util.getArServerURL(TenkenData.httpRequest.GetAllData);
}

// シナリオをダウンロード
TenkenData.AllGet.downloadScenario = function(_mode, _downloadSuccess, _downloadError)
{
	Tenken.Util.loginfo("GET_ALL_DATA_SCENARIO:START");

	// 全ダウンロード後に呼ばれるコールバックを保存
	TenkenData.AllGet.downloadScenarioSuccessFunc=_downloadSuccess;
	TenkenData.AllGet.downloadScenarioErrorFunc=_downloadError;

	// 強制モード設定
	var mode=( false == _mode ) ? false : true;
	TenkenData.setSuperReloadMode(mode);

	// シナリオデータ
	TenkenData.Scenario.getScenario();

}

// 各データをローカルストレージに保存(シナリオ以外)
TenkenData.AllGet.saveStorage = function()
{
    return Q.all([
        TenkenData.Asset.saveStorage(),
        TenkenData.MsgEvent.saveStorage(),
        TenkenData.TenkenEvent.saveStorage(),
        TenkenData.UserData.saveStorage(),
        TenkenData.Scene.saveStorage(),
        TenkenData.SuperimposedGraphic.saveStorage(),
        TenkenData.TenkenTable.saveStorage()
    ]);
}

// 各データをローカルストレージからロード (シナリオ以外)
TenkenData.AllGet.loadStorage = function() {
    return Q.all([
        TenkenData.Asset.loadStorage(),
        TenkenData.MsgEvent.loadStorage(),
        TenkenData.TenkenEvent.loadStorage(),
        TenkenData.UserData.loadStorage(),
        TenkenData.Scene.loadStorage(),
        TenkenData.SuperimposedGraphic.loadStorage(),
        TenkenData.TenkenTable.loadStorage()
    ]);
};

// シナリオデータをローカルストレージに保存
TenkenData.AllGet.saveStorageScenario = function()
{
	return TenkenData.Scenario.saveStorage();
};

// シナリオデータをローカルストレージからロード
TenkenData.AllGet.loadStorageScenario = function()
{
	return TenkenData.Scenario.loadStorage();
};

// 選択されたシナリオに必要のない項目を削除
// (ScenariodIdが0または選択シナリオID以外を削除)
TenkenData.AllGet.SkipDisableData = function()
{
	try {

		//--------------------------------------------------
		// 選択されているシナリオで有効な設備(asset)のみの
		// リストに再作成します。
		//--------------------------------------------------

		var tmpListAsset=[];

		// 点検項目テーブルで有効な設備IDを抽出
		var listAssets=new Object();

		var funcRow=function(_table, _group, _row, _poi, _valueEntryName, _value, _assetstatus)
		{
			if ( null == _row ) return;
			// 有効な点検項目で指定されているassetidのみを保存します。
			listAssets[_row.AssetId]=_row.AssetId;
		};

		TenkenData.TenkenTable.foreachTables(null, null, null, funcRow);

		// 有効な点検項目で指定されているassetidのリストに指定されている
		// 設備のみで設備リストを再作成します。
		// 点検項目テーブルで利用されていないassetidを配列リストにします。
		var found=0;
		var arrayDeleteAsset=[];
		for ( var i = 0 ; i < TenkenData.Asset.ListAll.length ; i++ )
		{
			found=0;
			for ( assetid in listAssets )
			{
				if ( assetid == TenkenData.Asset.ListAll[i].assetid )
				{
					found=1;
					break;
				}
			}
			if ( 0 == found )
			{
				arrayDeleteAsset.push(TenkenData.Asset.ListAll[i].assetid);
			}
		}
		if ( 0 < arrayDeleteAsset.length )
		{
			for ( var i =0 ; i < arrayDeleteAsset.length ; i++ )
			{
				TenkenData.Asset.deleteAsset(arrayDeleteAsset[i]);
			}
		}

		//--------------------------------------------------
		// 選択されているシナリオで有効なマーカーIDのみの
		// AR重畳表示データに再作成します。
		//--------------------------------------------------
		// 有効なマーカーIDリストを生成
		var listMarkerIds=new Object();
		for ( var aid in listAssets )
		{
			var mid=-1;
			mid=TenkenData.Asset.getMarkerIdfromAssetId(aid);
			listMarkerIds[mid]=mid;
		}

		// AR重畳表示データ中から無効マーカーIDのデータを削除する
		for(var scene in TenkenData.SuperimposedGraphic.objSuperimposedGraphics)
		{
			var listScenes=TenkenData.SuperimposedGraphic.objSuperimposedGraphics[scene];

			for(var markerid in listScenes)
			{
				if ( null == listMarkerIds[markerid] )
				{
					delete TenkenData.SuperimposedGraphic.objSuperimposedGraphics[scene][markerid];
				}
			}
		}
	}
	catch (e)
	{
		alert("Exception : TenkenData.AllGet.SkipDisableData\n" + e);
	}
};

// 全データダウンロード後の後処理
TenkenData.AllGet.afterDownload2 = function()
{
    Tenken.timingData["TenkenData.AllGet.download"].end = new Date();
    Tenken.timingData["TenkenData.AllGet.afterDownload2"] = {start:new Date()};

	Tenken.Util.loginfo("GET_ALL_DATA2:END:SUCCESS");

	// Display of equipment information with no Tenken redmine #7996
	// TenkenData.AllGet.SkipDisableData();

	//TenkenData.AllGet.saveStorage();

	// 全データが完了した場合、作業者選択画面の作業者リストと
	// (登録されていれば)ダウンロード完了通知用コールバックを呼び出す
	var elm = document.getElementById("operatorselect");
	if ( null != elm )
	{
		elm.innerHTML=TenkenData.UserData.getUserNameHTML();
	}

	// 事前ダウンロード
	TenkenData.AllGet.PreloadData();

}

// 全データダウンロード後の後処理
TenkenData.AllGet.afterDownload3 = function()
{
	TenkenData.PreloadImages.PreloadDataStasus();
	TenkenData.PreloadImages.term();

    Tenken.timingData["TenkenData.AllGet.afterDownload2"].end = new Date();

	if ( null != TenkenData.AllGet.downloadSuccessFunc )
	{
		TenkenData.AllGet.downloadSuccessFunc();
	}
}

// ダウンロード失敗時(全データ完了後)に呼ばれます。
// エラーメッセージを表示して終了します。
TenkenData.AllGet.afterDownloadError = function(_errorMsg)
{
	Tenken.Util.logerr("GET_ALL_DATA1:END:ERROR:" + _errorMsg);

	if ( null != TenkenData.AllGet.downloadErrorFunc )
	{
		// 一度しか呼び出さないようにするためコールバックをクリアする
		var func=TenkenData.AllGet.downloadErrorFunc;
		TenkenData.AllGet.downloadErrorFunc=null;
		func(_errorMsg);
	}
}

// データ受信時に利用者定義データに誤りがある場合は、
// データをクリアし、初画面(index.html)に戻る
TenkenData.AllGet.abortInvalidData = function(_table, _qattribute, _value, _msghead, _msg)
{
	// 既にabort処理中の場合は何もしない
	if ( true == TenkenData.AllGet.abortON ) return;

	TenkenData.AllGet.abortON=true;

	// ストレージとARのオフラインストレージデータの削除
    Tenken.Storage.clearCurrent();
    Tenken.Storage.TenkenVersions.remove();

	// メッセージの出力
	var str="";
	if ( null != _msghead )
	{
		str=_msghead;
	}
	else
	{
		str="データ定義に誤りがありました。\n\n";
	}
	if ( _table ) str += "テーブル名=" + _table + "\n";
	if ( _qattribute ) str += "QAttribute名=" + _qattribute + "\n";
	if ( _value ) str += "値=" + _value + "\n";
	if ( _msg ) str += "\n" + _msg + "\n";
	str += "\n処理を中止し、点検シナリオ選択画面に戻ります\n";
	alert(str);

    TenkenData.AllGet.downloadSuccessFunc = null;
	// 初画面へ移動
	location.replace(TenkenConst.PageName.top);
}

// 事前ダウンロード
TenkenData.AllGet.PreloadData = function()
{

	// 事前ロードの無効化指定チェック
	var skipPreload=false;
	var skipPreloadSG=false;
	var skipPreloadAsset=false;

	if ( null != Tenken.config.ScenarioId && 0 < TenkenData.Scenario.ListAll.length)
	{
		var lenScenaio=TenkenData.Scenario.ListAll.length;
		for ( var i=0 ; i < lenScenaio; i++ )
		{
			var asset=TenkenData.Scenario.ListAll[i];
			if ( Tenken.config.ScenarioId == TenkenData.Scenario.ListAll[i].scenarioId )
			{
				if ( 0 <= asset.description.indexOf("#unpreload#"))		
				{
					// 指定あり。選択シナリオの全事前ダウンロードを無効化
					skipPreload=true;
				}
				if ( 0 <= asset.description.indexOf("#unpreloadsg#"))
				{
					// 指定あり。重畳表示データの事前ダウンロードを無効化
					skipPreloadSG=true;
				}
				if ( 0 <= asset.description.indexOf("#unpreloadasset#"))		
				{
					// 指定あり。assetテーブルの追加アイコンの 指定ファイル
					// の事前ダウンロードを無効化
					skipPreloadAsset=true;
				}
			}
		}
	}
	if ( false == Tenken.config.preloadFile || true == skipPreload )
	{
		// 事前ダウンロードしない設定のため何もしない
		// 次の処理を呼ぶ
		// 次の処理を呼ぶ
		TenkenData.AllGet.afterDownload3();
		return;
	}

	//AR重畳表示定義を事前ダウンロード
	if ( true != skipPreloadSG )
	{
		var listSG=TenkenData.SuperimposedGraphic.objSuperimposedGraphics;
		if ( null != listSG )
		{
			for(scene in listSG)
			{
			    // Change to call AR.Renderer.put per scene due to load overlay 101 objects issue
			    var preloadSuperimposedGraphics = [];
			    
				if( null != listSG[scene])
				{
					for(marker in listSG[scene])
					{
						var arraySG=listSG[scene][marker];
						if ( null != arraySG && 0 < arraySG.length )
						{
							for ( var i=0 ; i < arraySG.length ; i++ )
							{
								var sg=arraySG[i];
								if ( null != sg )
								{
									preloadSuperimposedGraphics.push(sg);
								}
							}
						}
					}
				}
				
		        if ( 0 < preloadSuperimposedGraphics.length )
		        {
		            Tenken.ARRendering.createSuperimposedGraphicsPreload(preloadSuperimposedGraphics);
		        }
			}
		}

	}

	// assetの追加アイコンにURLが指定されている場合、
	// 事前ダウンロードを実施します。

	if ( false == Tenken.config.preloadAssetFile || true == skipPreloadAsset )
	{
		// 事前ダウンロードしない設定のため何もしない
		// 次の処理を呼ぶ
		TenkenData.AllGet.afterDownload3();
		return;
	}

	if ( !AR.Data.cacheUrlResource )
	{
		// APIが利用できないバージョンのため
		// 次の処理を呼ぶ
		TenkenData.AllGet.afterDownload3();
		return;
	}

	// 事前ダウンロード
    // 対象リソース
    // 1. iconで始まるデータの以下の形式の
	//    "アイコン名;アイコンイメージファイル名;タップ時オープンファイル名")
	//    アイコンイメージファイルとタップ時オープンファイル名
	// 2. msgICON(申送追加)のアイコンイメージファイル
	//    "アイコン名;アイコンイメージファイル名"
	// 3. tenkenICON(点検入力)のアイコンイメージファイル
	//    "アイコン名;アイコンイメージファイル名")

	TenkenData.PreloadImages.init();

	var len=TenkenData.Asset.ListAll.length;
	for ( var i=0 ; i < len ; i++ )
	{
		var asset=TenkenData.Asset.ListAll[i];
		// iconで始まる追加アイコン
		if ( null != asset && null != asset.listICON)
		{
			var lenListIcon=asset.listICON.length;
			for ( var j = 0 ; j < lenListIcon ; j++ )
			{
				if ( null == asset.listICON[j] ) continue;

				var iconInfo=asset.listICON[j];
				if ( null != iconInfo[1]  ) TenkenData.PreloadImages.preloadImageAdd(iconInfo[1]);
				if ( null != iconInfo[2]  )TenkenData.PreloadDatas.preloadDataAdd(iconInfo[2]);
			}

		}
		// msgICON(申送追加)のアイコンイメージファイル
		if ( null != asset && null != asset.msgICON )
		{
			var iconInfo=asset.msgICON[0];
			if ( iconInfo )
			if ( null != iconInfo[1] )
			{
				TenkenData.PreloadImages.preloadImageAdd(iconInfo[1]);
			}
		}

		// tenkenICON(点検入力)のアイコンイメージファイル
		if ( null != asset && null != asset.tenkenICON )
		{
			var iconInfo=asset.tenkenICON[0];
			if ( iconInfo )
			if ( null != iconInfo[1] )
			{
				TenkenData.PreloadImages.preloadImageAdd(iconInfo[1]);
			}
		}
	}
	TenkenData.PreloadDatas.preloadData();
	TenkenData.PreloadImages.preloadImage();

}

TenkenData.PreloadDatas={};
TenkenData.PreloadDatas.loadDatas=[];

TenkenData.PreloadDatas.init = function()
{
	TenkenData.PreloadDatas.loadDatas=[];
}
TenkenData.PreloadDatas.term = function()
{
	TenkenData.PreloadDatas.loadDatas=[];
}

TenkenData.PreloadDatas.preloadDataAdd = function(_url)
{
	// 問い合わせ(?)があるもの、先頭がhttpで無いものは対象外。
	// http://が先頭にない8文字に満たない場合も対象外。
	var strURL=_url;
	if (  strURL.length < 8 ) return;
	if (  0 <= strURL.indexOf("?") ) return;
	var strProtcol=strURL.substring(0,4);
	if ( "http" != strProtcol.toLowerCase() ) return;


	// 同じURLは登録しない
	var newAdd=true;
	var len=TenkenData.PreloadDatas.loadDatas.length;
	for ( var i=0; i < len ; i++ )
	{
		if ( strURL == TenkenData.PreloadDatas.loadDatas[i] )
		{
			var newAdd=false;
			break;
		}
	}
	if ( true == newAdd )
	{
		TenkenData.PreloadDatas.loadDatas.push(strURL);
	}

}

TenkenData.PreloadDatas.preloadData = function()
{
	var len=TenkenData.PreloadDatas.loadDatas.length;
	for ( var i=0 ; i < len ; i++ )
	{
		Tenken.Util.loginfo("LOAD_DATA:Preload:" + TenkenData.PreloadDatas.loadDatas[i]);

		AR.Data.cacheUrlResource(TenkenData.PreloadDatas.loadDatas[i], Tenken.Util.noop, Tenken.Util.noop);

	}
}



TenkenData.PreloadImages={};
TenkenData.PreloadImages.loadImgs=[];
TenkenData.PreloadImages.errLoadimgs=[];
TenkenData.PreloadImages.countOKimgs=0;
TenkenData.PreloadImages.countNGimgs=0;

TenkenData.PreloadImages.onLoadImg = function(event)
{
	TenkenData.PreloadImages.countOKimgs++;

	if ( null != event && null != event.target)
	{
		Tenken.Util.loginfo("LOAD_IMAGE:Preload:END:OK:" + event.target.src);
	}
	if ( TenkenData.PreloadImages.loadImgs.length <= (TenkenData.PreloadImages.countOKimgs +  TenkenData.PreloadImages.countNGimgs ))
	{
		TenkenData.AllGet.afterDownload3();
	}
}
TenkenData.PreloadImages.onErrorImg = function(event)
{
	TenkenData.PreloadImages.countNGimgs++;

	// イメージロードが失敗したURLを保存
	if ( null != event && null != event.target)
	{
		Tenken.Util.loginfo("LOAD_IMAGE:Preload:END:NG:" + event.target.src);
		TenkenData.PreloadImages.errLoadimgs.push(event.target.src);
	}
	if ( TenkenData.PreloadImages.loadImgs.length <= (TenkenData.PreloadImages.countOKimgs +  TenkenData.PreloadImages.countNGimgs ))
	{
		TenkenData.AllGet.afterDownload3();
	}
}

TenkenData.PreloadImages.PreloadDataStasus = function()
{
	var len=TenkenData.PreloadImages.errLoadimgs.length;
	if ( 0 < len)
	{
		var msg = "イメージファイルのロードに失敗しました。\n";
		for ( var i=0 ; i < len ; i++ )
		{
			msg += TenkenData.PreloadImages.errLoadimgs[i] + "\n";
		}
		msg += "\n";
		alert(msg);
	}
}

TenkenData.PreloadImages.init = function()
{
	TenkenData.PreloadImages.countOKimgs=0;
	TenkenData.PreloadImages.countNGimgs=0;
	TenkenData.PreloadImages.loadImgs=[];
	TenkenData.PreloadImages.errLoadimgs=[];
}

TenkenData.PreloadImages.preloadImageAdd = function(_url)
{
	// 問い合わせ(?)があるもの、先頭がhttpで無いものは対象外。
	// http://が先頭にない8文字に満たない場合も対象外。
	var strURL=_url;
	if (  strURL.length < 8 ) return;
	if (  0 <= strURL.indexOf("?") ) return;
	var strProtcol=strURL.substring(0,4);
	if ( "http" != strProtcol.toLowerCase() ) return;

	// 同じURLは登録しない
	var newAdd=true;
	var len=TenkenData.PreloadImages.loadImgs.length;
	for ( var i=0; i < len ; i++ )
	{
		if ( strURL == TenkenData.PreloadImages.loadImgs[i] )
		{
			var newAdd=false;
			break;
		}
	}
	if ( true == newAdd )
	{
		TenkenData.PreloadImages.loadImgs.push(strURL);
	}
}
TenkenData.PreloadImages.preloadImage = function()
{
	// イメージをロードするためにimg要素を作成する
	var len=TenkenData.PreloadImages.loadImgs.length
	if ( len <= 0 )
	{
		// ロードするイメージがないため、次の処理を行う。
		TenkenData.AllGet.afterDownload3();
		return;
	}
	for ( var i=0 ; i < len ; i++ )
	{
		var image = new Image(1,1);
		image.id = "ar_loadimagecache";
		image.hidden = true;
		image.src = TenkenData.PreloadImages.loadImgs[i];

		Tenken.Util.loginfo("LOAD_IMAGE:Preload:START:" + TenkenData.PreloadImages.loadImgs[i]);

		document.body.appendChild(image);

		image.hidden=true;
		if ( null != image.style ) image.style.display="none";

		image.addEventListener("load", TenkenData.PreloadImages.onLoadImg  ,false);
		image.addEventListener("error", TenkenData.PreloadImages.onErrorImg,false);
	}
}

TenkenData.PreloadImages.term = function()
{
	// 前回までにロードしたimgが残っている場合には削除する
	var elm=null;
	elm=document.getElementById("ar_loadimagecache");
	for ( ; null != elm  ; )
	{
		document.body.removeChild(elm);
		elm=document.getElementById("ar_loadimagecache");
	}

	TenkenData.PreloadImages.countOKimgs=0;
	TenkenData.PreloadImages.countNGimgs=0;
	TenkenData.PreloadImages.loadImgs=[];
	TenkenData.PreloadImages.errLoadimgs=[];
}

//============================================================================
// データ送信(点検結果:tenkenevent)
//============================================================================


// 点検結果送信時のコールバックおよびコールバックに渡すシーケンス値
TenkenData.TenkenEvent.onSuccess = null;
TenkenData.TenkenEvent.onError = null;
TenkenData.TenkenEvent.cbValue = null;

// 点検データを作成します。
TenkenData.TenkenEvent.createTenkenDataQuad = function(_data)
{
	// QUADを作成します。
	var quad = new TenkenARvalue.Quad(TenkenConst.TableName.tenkenevent);

	// QUADのタイプネームを設定します。
	quad.qtypeName = TenkenConst.TableName.tenkenevent;
    quad.version = _data.version;
    quad.id = _data.qentityId;

	var Id       = ( null != _data.tenken_id ) ? new TenkenARvalue.QValue(quad.qtypeName,  "tenkenid", null, _data.tenken_id, null) : null;
	var Name     = ( null != _data.tenken_name ) ? new TenkenARvalue.QValue(quad.qtypeName,  "tenkenname", _data.tenken_name, null, null) : null;
	var Description = ( null != _data.description ) ? new TenkenARvalue.QValue(quad.qtypeName,  "description", _data.description, null, null) : null;
	var Type = ( null != _data.type ) ? new TenkenARvalue.QValue(quad.qtypeName,  "type", _data.type, null, null) : null;
	var Registrationtime = ( null != _data.registrationtime ) ? new TenkenARvalue.QValue(quad.qtypeName,  "registrationtime", null, _data.registrationtime, null) : null;
	var RegDatetimeStr = ( null != _data.regDatetimeStr ) ? new TenkenARvalue.QValue(quad.qtypeName,  "regDatetimeStr", _data.regDatetimeStr, null, null) : null;
	var Registrant = ( null != _data.registrant ) ? new TenkenARvalue.QValue(quad.qtypeName,  "registrant", _data.registrant, null, null) : null;
	var Markerid = ( null != _data.markerid ) ? new TenkenARvalue.QValue(quad.qtypeName,  "markerid", null, _data.markerid, null) : null;
	var Markername = ( null != _data.markername ) ? new TenkenARvalue.QValue(quad.qtypeName,  "markername", _data.markername, null, null) : null;
	var Targetassetid = ( null != _data.targetassetid ) ? new TenkenARvalue.QValue(quad.qtypeName,  "targetassetid", _data.targetassetid, null, null) : null;
	var AssetStatus = ( null != _data.assetstatus ) ? new TenkenARvalue.QValue(quad.qtypeName,  "assetstatus", _data.assetstatus, null, null) : null;
	var Occurrencetime = ( null != _data.occurrencetime ) ? new TenkenARvalue.QValue(quad.qtypeName,  "occurrencetime", null, _data.occurrencetime, null) : null;
	var OccDatetimeStr = ( null != _data.occDatetimeStr ) ? new TenkenARvalue.QValue(quad.qtypeName,  "occDatetimeStr", _data.occDatetimeStr, null, null) : null;
	var Operator = ( null != _data.operator ) ? new TenkenARvalue.QValue(quad.qtypeName,  "operator", _data.operator, null, null) : null;
	var ScenarioId = ( null != _data.ScenarioId ) ? new TenkenARvalue.QValue(quad.qtypeName,  "ScenarioId", null, _data.ScenarioId, null) : null;

	var F01 = ( null != _data.F01 ) ? new TenkenARvalue.QValue(quad.qtypeName,  "F01", null, null, _data.F01) : null;
	var F02 = ( null != _data.F02 ) ? new TenkenARvalue.QValue(quad.qtypeName,  "F02", null, null, _data.F02) : null;
	var F03 = ( null != _data.F03 ) ? new TenkenARvalue.QValue(quad.qtypeName,  "F03", null, null, _data.F03) : null;
	var F04 = ( null != _data.F04 ) ? new TenkenARvalue.QValue(quad.qtypeName,  "F04", null, null, _data.F04) : null;
	var F05 = ( null != _data.F05 ) ? new TenkenARvalue.QValue(quad.qtypeName,  "F05", null, null, _data.F05) : null;
	var S01 = ( null != _data.S01 ) ? new TenkenARvalue.QValue(quad.qtypeName,  "S01", _data.S01, null, null) : null;
	var S02 = ( null != _data.S02 ) ? new TenkenARvalue.QValue(quad.qtypeName,  "S02", _data.S02, null, null) : null;
	var S03 = ( null != _data.S03 ) ? new TenkenARvalue.QValue(quad.qtypeName,  "S03", _data.S03, null, null) : null;
	var S04 = ( null != _data.S04 ) ? new TenkenARvalue.QValue(quad.qtypeName,  "S04", _data.S04, null, null) : null;
	var S05 = ( null != _data.S05 ) ? new TenkenARvalue.QValue(quad.qtypeName,  "S05", _data.S05, null, null) : null;

	// 有効なQValueをQUADに設定します。
	var values =[];
	if ( null != Id ) values.push(Id);
	if ( null != Name ) values.push(Name);
	if ( null != Description ) values.push(Description);
	if ( null != Type ) values.push(Type);
	if ( null != Registrationtime ) values.push(Registrationtime);
	if ( null != RegDatetimeStr ) values.push(RegDatetimeStr);
	if ( null != Registrant ) values.push(Registrant);
	if ( null != Markerid ) values.push(Markerid);
	if ( null != Markername ) values.push(Markername);
	if ( null != Targetassetid ) values.push(Targetassetid);
	if ( null != AssetStatus ) values.push(AssetStatus);
	if ( null != Occurrencetime ) values.push(Occurrencetime);
	if ( null != OccDatetimeStr ) values.push(OccDatetimeStr);
	if ( null != Operator ) values.push(Operator);
	if ( null != ScenarioId ) values.push(ScenarioId);

	if ( null != F01 ) values.push(F01);
	if ( null != F02 ) values.push(F02);
	if ( null != F03 ) values.push(F03);
	if ( null != F04 ) values.push(F04);
	if ( null != F05 ) values.push(F05);
	if ( null != S01 ) values.push(S01);
	if ( null != S02 ) values.push(S02);
	if ( null != S03 ) values.push(S03);
	if ( null != S04 ) values.push(S04);
	if ( null != S05 ) values.push(S05);
	quad.qvalues=values;

	//文字列に変換します。
    return quad;
};

// 点検結果データの送信
// _tableids : 送信対象のテーブルIDを指定します。配列指定。
//              nullの場合は、すべて送信
// _submitall : false:停止状態の設備の点検結果は送信しない。
//              true またはその他:停止状態の設備の点検結果も送信する。
TenkenData.TenkenEvent.submitTenkenEvent = function(_tableids, _submitall)
{
	try
	{

		var tenkenlists = [];
		// 登録時間は、送信日時に設定しなおして送信します。
		var nowdatetime=new Date().getTime();

		TenkenData.TenkenTable.foreachTables(
			TenkenData.TenkenEvent.Current,
			null,
			null,
			function(_table, _group, _row, _poi2, _valueEntryName, _value, _assetstatus)
			{
				if ( null == _poi2 ) return;

				if ( false == _submitall && "STOP" == _assetstatus )
				{
					// 停止している設備の点検結果は送信しない
					return;
				}

                if(null != _tableids)
                {
                    var targetid=false;
                    for(var j=0; j<_tableids.length;j++) {
                        if (_tableids[j] == _table.TableId)
                        {
                            targetid=true;
                            break;
                        }
                    }
                    if(true != targetid)
                    {
                        return;
                    }
                }

                var replaceindex = -1;
				var tmptenken = null;

				for ( var l = 0 ; l < tenkenlists.length ; l++ )
				{
					tmptenken = tenkenlists[l];
					if ( _table.TableId == tmptenken.table_id &&
						 (null == _group || _group.RowGroupdId == tmptenken.rowgroups_id) &&
						 _row.TenkenType == tmptenken.type )
					{
						replaceindex = l;
						break;
					}
				}
				if ( -1 != replaceindex )
				{
					var tenken=tmptenken;
				}
				else
				{
					var startdatetime = Tenken.Storage.startDatetime.get();
					if ( null == startdatetime )
					{
						startdatetime = nowdatetime;
					}
					var operator = Tenken.Storage.operator.get();

					var tenken = {};
					tenken.table_id = _table.TableId;
					tenken.table_name = _table.TableName;
					tenken.rowgroups_id = ( _group )  ? _group.RowGroupdId : null;
					tenken.rowgroups_name = ( _group )  ? _group.RowGroupdName : null;
					tenken.tenken_id = nowdatetime; // 現在時間をtenkenidとして利用する
					if ( null != _group && null != _group.RowGroupdName )
					{
						tenken.tenken_name = _table.TableName + "_" + _group.RowGroupdName;
					}
					else
					{
						tenken.tenken_name = _table.TableName;
					}
					tenken.description = _poi2.description;
					tenken.type = _poi2.type;
					tenken.registrationtime = nowdatetime;
					tenken.regDatetimeStr = new Tenken.DatetimeValue(nowdatetime).toStringFullTime();
					tenken.registrant =  operator;
					tenken.markerid =  _poi2.markerid;
					tenken.markername = _poi2.markername;
					tenken.targetassetid =  _row.AssetId;
					tenken.assetstatus = (_assetstatus != null) ? _assetstatus : "START";
					tenken.occurrencetime = startdatetime;
					tenken.occDatetimeStr = new Tenken.DatetimeValue(startdatetime).toStringFullTime();
					tenken.operator = operator;
					tenken.ScenarioId=Tenken.config.ScenarioId;
				}
				// 停止中設備の点検項目値F01～F05,S01～S05は設定しない。
				if ( "STOP" != _assetstatus )
				{
					/* entryname: F01 F02 F03 F04 F05 S01 S02 S03 S04 S05 */
					tenken[_row.DataEntryName]=_value;
				}

				if ( -1 != replaceindex )
				{
					tenkenlists[replaceindex]=tenken;
				}
				else
				{
					tenkenlists.push(tenken);
				}
			}
		);

        var uploadTenkenEventList = [];

		if ( tenkenlists.length <= 0  )
		{
			//alert("有効な送信用データがありません。");
			return uploadTenkenEventList;

		}


		// 送信用データを生成し格納する
		for ( var j = 0 ; j < tenkenlists.length ; j++ )
		{

            uploadTenkenEventList.push(TenkenData.TenkenEvent.createTenkenDataQuad(tenkenlists[j]));

		}

        return uploadTenkenEventList;

	}
	catch(e) {
		alert("点検結果データのアップロード中にエラーが発生しました。\n" + e);
		return false;
	}
}

//============================================================================
// データ送信(申し送り:messageevent)
//============================================================================

// 申し送り送信時のコールバックおよびコールバックに渡すシーケンス値
TenkenData.MsgEvent.onPostSuccess = null;
TenkenData.MsgEvent.onPostError = null;
TenkenData.MsgEvent.cbPostValue = null;

// 登録用の利用者定義データを作成します。
TenkenData.MsgEvent.CreateCommentDataQuad = function(_data)
{
	// QUADを作成します。
	var quad = new TenkenARvalue.Quad(TenkenConst.TableName.messageevent);

	// QUADのタイプネームを設定します。
	quad.qtypeName = TenkenConst.TableName.messageevent;
    quad.version = _data.version;
    quad.id = _data.qentityId;

	// QUADの各属性の値を作成します。

	var Id = ( null != _data.msgid ) ? new TenkenARvalue.QValue(quad.qtypeName,  "msgid", null, _data.msgid, null) : null;
	var Name = ( null != _data.msgname ) ? new TenkenARvalue.QValue(quad.qtypeName,  "msgname", _data.msgname, null, null) : null;
	var Description = ( null != _data.description ) ? new TenkenARvalue.QValue(quad.qtypeName,  "description", _data.description, null, null) : null;
	var Registrationtime = ( null != _data.registrationtime ) ? new TenkenARvalue.QValue(quad.qtypeName,  "registrationtime", null, _data.registrationtime, null) : null;
	var RegDatetimeStr = ( null != _data.regDatetimeStr ) ? new TenkenARvalue.QValue(quad.qtypeName,  "regDatetimeStr", _data.regDatetimeStr, null, null) : null;
	var Registrant = ( null != _data.registrant ) ? new TenkenARvalue.QValue(quad.qtypeName,  "registrant", _data.registrant, null, null) : null;
	var Markerid = ( null != _data.markerid ) ? new TenkenARvalue.QValue(quad.qtypeName,  "markerid", null, _data.markerid, null) : null;
	var Markername = ( null != _data.markername ) ? new TenkenARvalue.QValue(quad.qtypeName,  "markername", _data.markername , null, null) : null;
	var X = ( null != _data.x ) ? new TenkenARvalue.QValue(quad.qtypeName,  "x", null, null, _data.x) : null;
	var Y = ( null != _data.y ) ? new TenkenARvalue.QValue(quad.qtypeName,  "y", null, null, _data.y) : null;
	var Z = ( null != _data.z ) ? new TenkenARvalue.QValue(quad.qtypeName,  "z", null, null, _data.z) : null;
	var Targetassetid = ( null != _data.targetassetid ) ? new TenkenARvalue.QValue(quad.qtypeName,  "targetassetid", _data.targetassetid , null, null) : null;
	var Title = ( null != _data.title ) ? new TenkenARvalue.QValue(quad.qtypeName,  "title", _data.title, null, null) : null;
	var Level = ( null != _data.level ) ? new TenkenARvalue.QValue(quad.qtypeName,  "level", null, _data.level, null) : null;
	var Value = ( null != _data.value ) ?  new TenkenARvalue.QValue(quad.qtypeName,  "value",  _data.value, null, null) : null;
	var Occurrencetime = ( null != _data.occurrencetime ) ? new TenkenARvalue.QValue(quad.qtypeName,  "occurrencetime",  null, _data.occurrencetime, null) : null;
	var OccDatetimeStr = ( null != _data.occDatetimeStr ) ? new TenkenARvalue.QValue(quad.qtypeName,  "occDatetimeStr",  _data.occDatetimeStr, null, null) : null;
	var Operator = ( null != _data.operator ) ? new TenkenARvalue.QValue(quad.qtypeName,  "operator",  _data.operator, null, null) : null;
	var ScenarioId = ( null != _data.ScenarioId ) ? new TenkenARvalue.QValue(quad.qtypeName,  "ScenarioId", null, _data.ScenarioId, null) : null;
	var Enable = ( null != _data.Enable ) ? new TenkenARvalue.QValue(quad.qtypeName,  "Enable", _data.Enable, null, null) : null;
	var Answer = ( null != _data.Answer ) ? new TenkenARvalue.QValue(quad.qtypeName,  "Answer", _data.Answer, null, null) : null;

	// 有効なQValueをQUADに設定します。
	var values =[];
	if ( null != Id ) values.push(Id);
	if ( null != Name ) values.push(Name);
	if ( null != Description ) values.push(Description);
	if ( null != Registrationtime ) values.push(Registrationtime);
	if ( null != RegDatetimeStr ) values.push(RegDatetimeStr);
	if ( null != Registrant ) values.push(Registrant);
	if ( null != Markerid ) values.push(Markerid);
	if ( null != Markername ) values.push(Markername);
	if ( null != X ) values.push(X);
	if ( null != Y ) values.push(Y);
	if ( null != Z ) values.push(Z);
	if ( null != Targetassetid ) values.push(Targetassetid);
	if ( null != Title ) values.push(Title);
	if ( null != Level ) values.push(Level);
	if ( null != Value ) values.push(Value);
	if ( null != Occurrencetime ) values.push(Occurrencetime);
	if ( null != OccDatetimeStr ) values.push(OccDatetimeStr);
	if ( null != Operator ) values.push(Operator);
	if ( null != ScenarioId ) values.push(ScenarioId);
	if ( null != Enable ) values.push(Enable);
	if ( null != Answer ) values.push(Answer);
	quad.qvalues=values;

	//文字列に変換します。
    return quad;
};
// 申し送りデータの送信
TenkenData.MsgEvent.submitMsgEvent = function(_markerids)
{
	try
	{
		// 登録時間は、送信日時に設定しなおして送信します。
		var nowdatetime=new Date().getTime();

        var uploadMsgEventList = [];

        if ( TenkenData.MsgEvent.Current.length > 0 ) {
            for (var i = 0; i < TenkenData.MsgEvent.Current.length; i++) {
                var msgevent = TenkenData.MsgEvent.Current[i];

                // 送信対象のマーカーID配列が指定されていれば
                // 送信対象かチェックし、送信対象でない場合には送信しない。
                if (null != _markerids) {
                    var targetid = false;
                    for (var j = 0; j < _markerids.length; j++) {
                        if (_markerids[j] == msgevent.markerid) {
                            targetid = true;
                            break;
                        }
                    }
                    if (true != targetid) {
                        // 送信対象の対象のマーカーIDでないため、
                        // 送信せず次ぎのデータへ
                        continue;
                    }
                }

                // 登録時間は、送信日時に設定しなおして送信します。
                msgevent.registrationtime = nowdatetime;
                msgevent.regDatetimeStr = new Tenken.DatetimeValue(nowdatetime).toStringFullTime();

                uploadMsgEventList.push(
                    TenkenData.MsgEvent.CreateCommentDataQuad(msgevent));
            }
        }
        if ( TenkenData.MsgEvent.Last.length > 0 ) {
            for (var i = 0; i < TenkenData.MsgEvent.Last.length; i++) {
                var msgevent = TenkenData.MsgEvent.Last[i];

                if ("true" != msgevent.Enable && null != msgevent.Answer) {
                    uploadMsgEventList.push(
                        TenkenData.MsgEvent.CreateCommentDataQuad(msgevent));

                }
            }
        }
        return uploadMsgEventList;

	}
	catch(e) {
		alert("申し送りデータのアップロード中にエラーが発生しました。\n" + e);
		return false;
	}
};

//============================================================================
// latest tenken event management
//============================================================================

// データ管理クラス(点検結果データ)
TenkenData.LatestTenkenEvent = {};

// AR実行サーバのデータ送受信用TenkenARdata作成
TenkenData.LatestTenkenEvent.arLatestTenkenEvent=new TenkenARdata(TenkenConst.TableName.tenkeneventlatest);

TenkenData.LatestTenkenEvent.getphase = false;

TenkenData.LatestTenkenEvent.Last = [];

// 取得したデータをTenkenDataの管理用データに加工してコピーします。
TenkenData.LatestTenkenEvent.createDataList = function()
{
    try {
        if ( null == TenkenData.LatestTenkenEvent.arLatestTenkenEvent || null == TenkenData.TenkenEvent.Last ) {
            return;
        }

        var datas = TenkenData.LatestTenkenEvent.arLatestTenkenEvent.getDataValue();
        if ( null == datas ) return;
        var countList=datas.length;
        for ( var i=0 ; i < countList ; i++ )
        {
            var dataValue=datas[i];
            if ( null != dataValue )
            {
                TenkenData.TenkenEvent.Last.push(dataValue);

            }
        }
    }
    catch(e)
    {
        alert("Exception : TenkenData.LatestTenkenEvent.createDataList\n" + e);
    }
};

//create http request call API directly
TenkenData.httpRequest = {};
TenkenData.httpRequest.busy = false;

TenkenData.httpRequest.GetAllData = function(_data){
    try {
        TenkenData.httpRequest.busy = true;

        Tenken.Storage.serverURL.set(_data.getValue());

        var data = {
            "ScenarioId": Tenken.Storage.ScenarioId.get(),
            "tenken-versions": JSON.parse(Tenken.Storage.TenkenVersions.get()),
            "allScenarioMessage":true,
            "messageNum":100,
        };

        // Get all data via REST API
        TenkenData.httpRequest.callARTenkenAPI("/artenken/alldata", data, TenkenData.httpRequest.getDataSuccess, TenkenData.httpRequest.getDataError);

    } catch (e){
        TenkenData.httpRequest.getDataError("Exception : TenkenData.httpRequest.GetAllData", e);
    }

};

TenkenData.httpRequest.getDataSuccess = function(_result){
    var responseData = null;
    try{
        responseData = JSON.parse(_result);
    } catch(parseE) {
        try{
            responseData = eval("("+_result+")");
        } catch (evalE) {
            alert("Exception : TenkenData.httpRequest.getDataSuccess parse JSON data failed!\n" + e);
        }
    }
    if(null !== responseData) {
        TenkenData.httpRequest.extractData(responseData)
            .then(TenkenData.AllGet.afterDownload2)
            .fail(function(e){
                //ストレージとARのオフラインストレージデータの削除
                Tenken.Storage.clearCurrent();
                Tenken.Storage.TenkenVersions.remove();
                if(e.name.toUpperCase()=="QUOTA_EXCEEDED_ERR" || e.name.toUpperCase()=="QUOTAEXCEEDEDERROR"){
                    alert("キャッシュデータ量が上限に達しています。\n" + e);
                } else {
                    alert("データの取得に失敗しました。\n" + e);
                }
                location.replace(TenkenConst.PageName.top);
            });
    }

};

//Display error for downloading data
TenkenData.httpRequest.getDataError = function(_message, _result){

    var detail = _message + "\n" + (_result && _result.toSource ? _result.toSource() : "");

    if(_message instanceof Error) {
        Tenken.Util.logerr(_result, _message);
    }else{
        Tenken.Util.logerr(detail);
    }
    TenkenData.httpRequest.busy = false;

    TenkenData.AllGet.afterDownloadError(detail);

};

TenkenData.httpRequest.extractData = function(_data){

        if (null == _data)
        {
            return Q.when();
        }
        //save table version information
        Tenken.Storage.TenkenVersions.set(JSON.stringify(_data[TenkenConst.FetchedTableName.tenkenVersions]));

        var promises = [];

        //create latest tenkenevent list
        if( true == _data[TenkenConst.FetchedFlag.TENKENEVENT] )
        {
            if (null == TenkenData.LatestTenkenEvent.arLatestTenkenEvent) {
                TenkenData.LatestTenkenEvent.arLatestTenkenEvent = new TenkenARdata(TenkenConst.TableName.tenkeneventlatest);
            }
            TenkenData.LatestTenkenEvent.arLatestTenkenEvent.extractHttpData(_data[TenkenConst.FetchedTableName.tenkenEvent]);

            TenkenData.TenkenEvent.Last.length = 0;
            TenkenData.LatestTenkenEvent.createDataList();

            promises.push(Q.all([Tenken.Storage.lastTenkenEventData.remove(),
               Tenken.Storage.currentTenkenEventData.remove()])
                .then(TenkenData.TenkenEvent.saveStorage));
        }
        else
        {
            promises.push(TenkenData.TenkenEvent.loadStorage());
        }

        //create asset data list
        if( true == _data[TenkenConst.FetchedFlag.ASSETS] )
        {
            if ( null == TenkenData.Asset.arAsset )
            {
                TenkenData.Asset.arAsset=new TenkenARdata(TenkenConst.TableName.asset);
            }
            TenkenData.Asset.arAsset.extractHttpData(_data[TenkenConst.FetchedTableName.asset]);

            TenkenData.Asset.ListAll.length=0;
            TenkenData.Asset.createDataList();

            if ( TenkenData.Asset.ListAll.length <= 0 )
            {
                TenkenData.AllGet.abortInvalidData(TenkenConst.TableName.asset, null, null, null, "有効な設備データが登録されていません。\n設備データを登録してください。\n", null);
                return Q.when();
            }

            promises.push(Tenken.Storage.lastAssetData.remove()
                .then(TenkenData.Asset.saveStorage));
        }
        else
        {
            promises.push(TenkenData.Asset.loadStorage());
        }

        //create msgEvent data list
        if( true == _data[TenkenConst.FetchedFlag.MESSAGEEVENT] )
        {
            if (null == TenkenData.MsgEvent.arMessageEventLast) {
                TenkenData.MsgEvent.arMessageEventLast = new TenkenARdata(TenkenConst.TableName.messageevent);
            }
            TenkenData.MsgEvent.arMessageEventLast.extractHttpData(_data[TenkenConst.FetchedTableName.messageEvent]);

            TenkenData.MsgEvent.Last.length = 0;
            TenkenData.MsgEvent.createDataList();

            promises.push(Q.all([Tenken.Storage.lastMessageEventData.remove(),
                Tenken.Storage.currentMessageEventData.remove()])
                    .then(TenkenData.MsgEvent.saveStorage));
        }
        else
        {
            promises.push(TenkenData.MsgEvent.loadStorage());
        }

        //create tenkentable data list
        if( true == _data[TenkenConst.FetchedFlag.TENKENTABLE] )
        {
            if (null == TenkenData.TenkenTable.arTenkenTable) {
                TenkenData.TenkenTable.arTenkenTable = new TenkenARdata(TenkenConst.TableName.tenkentable);
            }
            TenkenData.TenkenTable.arTenkenTable.extractHttpData(_data[TenkenConst.FetchedTableName.tenkentable]);

            TenkenData.TenkenTable.ListTables.length = 0;
            TenkenData.TenkenTable.createDataList();

            promises.push(Tenken.Storage.TenkenTable.remove()
                .then(TenkenData.TenkenTable.saveStorage));
        }
        else
        {
            promises.push(TenkenData.TenkenTable.loadStorage());
        }

        //create userdata data list
        if( true == _data[TenkenConst.FetchedFlag.USERDATA] )
        {
            if (null == TenkenData.UserData.arUserData) {
                TenkenData.UserData.arUserData = new TenkenARdata(TenkenConst.TableName.userdata);
            }
            TenkenData.UserData.arUserData.extractHttpData(_data[TenkenConst.FetchedTableName.userData]);

            TenkenData.UserData.ListAll.length = 0;
            TenkenData.UserData.createDataList();

            if (TenkenData.UserData.ListAll.length <= 0) {
                TenkenData.AllGet.abortInvalidData(TenkenConst.TableName.userdata, null, null, null, "有効な作業者データが登録されていません。\n作業者データを登録してください。", null);
                return Q.when();
            }

            promises.push(Tenken.Storage.UserData.remove()
                .then(TenkenData.UserData.saveStorage));
        }
        else
        {
            promises.push(TenkenData.UserData.loadStorage());
        }

        //create scene data list
        if( true == _data[TenkenConst.FetchedFlag.ARSCENES] )
        {
            if (null == TenkenData.Scene.arScene) {
                TenkenData.Scene.arScene = new TenkenARdata(TenkenConst.TableName.scene);
            }
            TenkenData.Scene.arScene.extractHttpData(_data[TenkenConst.FetchedTableName.scene]);

            TenkenData.Scene.ListAll.length = 0;
            TenkenData.Scene.createDataList();
            promises.push(Q.all([Tenken.Storage.SceneList.remove(),
                Tenken.Storage.SceneNames.remove()])
                    .then(TenkenData.Scene.saveStorage));
        }
        else
        {
            promises.push(TenkenData.Scene.loadStorage());
        }

        //create superimposedgraphic data list
        if( true == _data[TenkenConst.FetchedFlag.ARCONTENT] )
        {
            if (null == TenkenData.SuperimposedGraphic.arSuperimposedGraphic) {
                TenkenData.SuperimposedGraphic.arSuperimposedGraphic = new TenkenARdata(TenkenConst.TableName.SuperimposedGraphic);
            }
            TenkenData.SuperimposedGraphic.arSuperimposedGraphic.extractHttpData(_data[TenkenConst.FetchedTableName.SuperimposedGraphic]);

            TenkenData.SuperimposedGraphic.objSuperimposedGraphics = null;
            TenkenData.SuperimposedGraphic.createDataList();

            promises.push(Tenken.Storage.SuperimposedGraphic.remove()
                .then(TenkenData.SuperimposedGraphic.saveStorage));
        }
        else
        {
            promises.push(TenkenData.SuperimposedGraphic.loadStorage());
        }
        TenkenData.httpRequest.busy = false;

    return Q.all(promises);
};

TenkenData.httpRequest.getBusyStatus = function(){
    return TenkenData.httpRequest.busy;
};

TenkenData.httpRequest.submit = function(_tenkenList, _msgList, _onSuccess, _onError){

    try {
        var data = {
            "newtenkenevents": _tenkenList,
            "newmessageevents": _msgList
        };
        
        TenkenData.httpRequest.callARTenkenAPI("/artenken/uploadData", data, _onSuccess, _onError);

    } catch (e){
        var errorMsg = "TenkenData.httpRequest.submit function failed.";
        _onError(errorMsg, e);
    }
};

// Send REST call for resources
TenkenData.httpRequest.callARTenkenAPI = function(_resourcePath, _jsonData, _onSuccess, _onError){
    var url = Tenken.Storage.serverURL.get();
    if(url === null){
        var errorMsg = "AR実行サーバのURLを取得できませんでした。";
        _onError.call(errorMsg);
        return;
    }

    if ('/' === url[url.length - 1]) url =  url.replace(/\/$/, '');
    url = url + _resourcePath;

    var xmlhttp = new XMLHttpRequest();

    xmlhttp.open(
        "POST",
        url,
        true
    );

    //setup basic authorization username and password
    var authstr = "Basic " + btoa(Tenken.config.AUTH_USER.USER_ID + ":" + Tenken.config.AUTH_USER.PASSWORD);
    xmlhttp.setRequestHeader("Authorization", authstr);

    xmlhttp.setRequestHeader("Content-Type", "application/json");

    //set cross domain post allowed
    xmlhttp.setRequestHeader("Access-Control-Request-Origin", "*");
    xmlhttp.setRequestHeader("Access-Control-Request-Method", "POST");

    //post data callback
    xmlhttp.onreadystatechange = function () {
        if (xmlhttp.readyState == 4) {
            var response = xmlhttp.responseText;
            if (xmlhttp.status == 200) {
                _onSuccess(response);
            } else {
                var errorMsg = "サーバとの通信に失敗しました。\n";
                errorMsg += (xmlhttp.status ? "status: " + xmlhttp.status : "") + " " + (xmlhttp.statusText ? xmlhttp.statusText : "");
                _onError(errorMsg, response);
            }
        }
    };

    xmlhttp.send(JSON.stringify(_jsonData));


};