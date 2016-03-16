/**
 * @overview 点検業務向けJavaScript API群(ARレンダリング)です。
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
 * AR.Rendererを補足するライブラリ空間です。
 */
Tenken.ARRendering = new function() {
	// 設備名と申し送り表示用の標準ポリゴン(四角形)のサイズ(Scale)。
	// 利用端末の画面解像度に応じてサイズは変更。初期値は各0.5。
	var sizeX = 0.5;
	var sizeY = 0.5;
	var sizeZ = 0.5;

	/**
	 * AR.Renderer.AbstractElementの属性を設定します。
	 * 以下のパラメータ以外は、AR.Renderer.AbstractElementを参照してください。
	 * @param {AR.Renderer.AbstractElement} _elm 設定対象となるAR.Renderer.AbstractElement
	 */
	function setAbstractElementProps(_elm, _id) {
		_elm.setId(_id);
	}

	/**
	 * AR.Renderer.AbstractNamedElementの属性を設定します。
	 * 以下のパラメータ以外は、AR.Renderer.AbstractNamedElementを参照してください。
	 * @param {AR.Renderer.AbstractNamedElement} _elm 設定対象となるAR.Renderer.AbstractNamedElement
	 */
	function setAbstractNamedElementProps(_elm, _id, _name) {
		setAbstractElementProps(_elm, _id);
		_elm.setName(_name);
	}

	/**
	 * AR.Renderer.AbstractCoordinateSystemの属性を設定します。
	 * 以下のパラメータ以外は、AR.Renderer.AbstractCoordinateSystemを参照してください。
	 * @param {AR.Renderer.AbstractCoordinateSystem} _elm 設定対象となるAR.Renderer.AbstractCoordinateSystem
	 */
	function setAbstractCoordinateSystemProps(_elm, _id, _name, _disabled, _detectAction) {
		setAbstractNamedElementProps(_elm, _id, _name, _disabled);
	}

	/**
	 * AR.Renderer.AbstractMarkerCoordinateSystemの属性を設定します。
	 * 以下のパラメータ以外は、AR.Renderer.AbstractMarkerCoordinateSystemを参照してください。
	 * @param {AR.Renderer.AbstractMarkerCoordinateSystem} _elm 設定対象となるAR.Renderer.AbstractMarkerCoordinateSystem
	 */
	function setAbstractMarkerCoordinateSystemProps(_elm, _id, _name, _disabled, _detectAction) {
		setAbstractCoordinateSystemProps(_elm, _id, _name, _disabled, _detectAction);
	}

	/**
	 * AR.Renderer.Pointを生成して返します。
	 * パラメータについては、AR.Renderer.Pointを参照してください。
	 */
	function createPoint(_id, _x, _y, _z) {
		var elm = new AR.Renderer.Point();
		setAbstractElementProps(elm, _id);
		elm.setX(_x);
		elm.setY(_y);
		elm.setZ(_z);
		return elm;
	}

	/**
	 * AR.Renderer.Sizeを生成して返します。
	 * パラメータについては、AR.Renderer.Sizeを参照してください。
	 */
	function createSize(_id, _x, _y, _z) {
		var elm = new AR.Renderer.Size();
		setAbstractElementProps(elm, _id);
		elm.setWidth(_x);
		elm.setHeight(_y);
		elm.setDepth(_z);
		return elm;
	}

	/**
	 * AR.Renderer.URLActionを生成して返します。
	 * パラメータについては、AR.Renderer.URLActionを参照してください。
	 */
	function createURLAction(_id, _url) {
		var elm = new AR.Renderer.URLAction();
		setAbstractElementProps(elm, _id);
		elm.setSrc(_url);
		return elm;
	}

	/**
	 * AR.Renderer.DirectorActionを生成して返します。
	 * パラメータについては、AR.Renderer.DirectorActionを参照してください。
	 */

	function createDirectorAction(_id, _expression) {
		var elm = new AR.Renderer.ScriptAction();
		setAbstractElementProps(elm, _id);
		elm.setExpression(_expression);
		return elm;
	}

	/**
	 * AR.Renderer.FJARMarkerCoordinateSystemを生成して返します。
	 * パラメータについては、AR.Renderer.FJARMarkerCoordinateSystemを参照してください。
	 */
	function createFJARMarkerCoordinateSystem(_id, _name, _disabled, _detectAction, _value) {
		var elm = new AR.Renderer.FJARMarkerCoordinateSystem();
		setAbstractMarkerCoordinateSystemProps(elm, _id, _name, _disabled, _detectAction);
		elm.setValue(_value);
		return elm;
	}

	/**
	 * AR.Renderer.SuperimposedGraphicを生成して返します。
	 * パラメータについては、AR.Renderer.SuperimposedGraphicを参照してください。
	 */
	function createSuperimposedGraphic(_id, _name, _disabled, _translation, _rotation, _projectionType, _clickAction, _graphic, _line) {
		var elm = new AR.Renderer.SuperimposedGraphic();
		setAbstractNamedElementProps(elm, _id, _name, _disabled);
		elm.setTranslation(_translation);
		elm.setRotation(_rotation);
		elm.setProjectionType(_projectionType);
		elm.setTapAction(_clickAction);
		elm.setGraphic(_graphic);
		return elm;
	}

	function createSquare(_id, _scale, _color, _texture) {
		var elm = new AR.Renderer.SquareModelGraphic();
		elm.setScale(_scale);
		elm.setTexture(_texture);
		return elm;
	}

	/**
	 * AR.Renderer.Imageを生成して返します。
	 * パラメータについては、AR.Renderer.Imageを参照してください。
	 */
	function createImage(_id, _url, _size) {
		var elm = new AR.Renderer.ImageTexture();
		elm.setSrc(_url);
		return elm;
	}

	/**
	 * AR.Renderer.Textを生成して返します。
	 * パラメータについては、AR.Renderer.Textを参照してください。
	 */
	function createText(_id, _value, _fontSize, _color, _backgroundcolor, _wordWrap, _size) {
		var elm = new AR.Renderer.TextTexture();
		setAbstractElementProps(elm, _id);
		elm.setText(_value);
		elm.setFontSize(_fontSize);
		elm.setColor(_color);
		elm.setBackgroundColor(_backgroundcolor);
		elm.setWordWrap(_wordWrap);
//      文字サイズはデフォルト
//		if ( true == _wordWrap && null != _size)
//		{
//			/* ワードラップが有効の場合、サイズの設定を行う */
//			elm.setSize(_size);
//		}
		return elm;
	}

	var TRANSPARENT = 0x00000000;
	var RED = 0xFFCC0000;
	var BLUE = 0xFF1E90FF;
	var GREEN = 0xFF009900;
	var GRAY = 0xFF7A7D80;
	var DARKGRAY = 0xFF333333;
	var WHITE = 0xFFFFFFFF;
	var ORANGERED = 0xFFFF4500;
	var BORDERWIDTH = 3;
	var PADDING = 3;
	var FONTSIZE = 70;
	var SMALLFONTSIZE = 40;
	var BIGFONTSIZE = 100;

	function truncateString(_str, _len) {
		var str = "";
		if(null != _str) {
			str = _str.substr(0, _len); // 指定サイズで切ってみて…
			if(_len < _str.length) str = str.substr(0, _len -1) + "…"; // 元の文字列より短くなっていたら、最後の文字を「…」に置き換える
		}
		return str;
	}

	function createEZFJARMarkerCoordinateSystem(_markerId) {
		return createFJARMarkerCoordinateSystem(
			null/*_id*/,
			null/*_name*/,
			false/*_disabled*/,
			null/*_detectAction*/,
			_markerId/*_value*/);
	};

	function createEZSuperimposedGraphic(_name, _translation, _clickAction, _graphic) {
		return createSuperimposedGraphic(
			null/*_id*/,
			_name/*_name*/,
			false/*_disabled*/,
			_translation/*_translation*/,
			null/*_rotation*/,
			AR.Renderer.SuperimposedGraphic.ProjectionType.ORTHO2D/*_projectionType*/,
			_clickAction/*_clickAction*/,
			_graphic/*_graphic*/
			);
	};

	function createAssetNameGraphic(_name) {
		return createSquare(
			null,   /*_id*/
			createPoint(null,sizeX, sizeY, sizeZ),   /*_scale*/
            TRANSPARENT,   /*_color*/
				createText(
					null/*_id*/,
					truncateString(_name, 20)/*_value*/,
					75/*_fontSize*/,
					ORANGERED/*_color*/,
					TRANSPARENT/*_backgroundcolor*/,
					false/*_wordWrap*//*_graphic*/)/*_layouter*/,
					null /*_size*/
            );
	};

	function createMessageGraphic(_datetime, _operator, _message) {
		return createSquare(
			null,   /*_id*/
			createPoint(null, sizeX, sizeY, sizeZ),   /*_scale*/
            TRANSPARENT,   /*_color*/
					createText(
						null/*_id*/,
						truncateString(_message, 10)/*_value*/,
						FONTSIZE/*_fontSize*/,
						WHITE/*_color*/,
						GREEN/*_backgroundcolor*/,
						true/*_wordWrap*/,
						new AR.Renderer.Size() /*_size*/
						)
            )
	};

	function createCautionGraphic(_datetime, _operator, _message) {
		return createSquare(
			null,   /*_id*/
			createPoint(null, sizeX, sizeY, sizeZ),   /*_scale*/
            TRANSPARENT,   /*_color*/
					createText(
						null/*_id*/,
						truncateString(_message, 10)/*_value*/,
						FONTSIZE/*_fontSize*/,
						WHITE/*_color*/,
						RED/*_backgroundcolor*/,
						true/*_wordWrap*/,
						new AR.Renderer.Size() /*_size*/
						)
            )
	};

	/** ARコンテンツ削除のonErrorに設定するコールバック関数です。 */
	contentsRemoveError = function(_result){
		var message = "ARコンテンツの削除に失敗しました。\n";
		var detail = _result.getStatus() + "\n"+ _result.getValue();
		Tenken.Util.logerr(message, detail);
	};

	/** AR重畳表示定義データ追加のonErrorに設定するコールバック関数です。 */
	contenstPutError = function(_result){
		var message = "AR重畳表示定義データの追加に失敗しました。\n";
		var detail = _result.getStatus() + "\n"+ _result.getValue();
		Tenken.Util.logerr(message, detail);
	};

	/** 指定したシーンID、マーカーIDのAR重畳表示定義データをネイティブの描画レイヤに設定します。 */
	this.createSuperimposedGraphics = function(_superimposedgraphics, _sceneId, _markerId){
		if(_superimposedgraphics[_sceneId] != null){ // 指定したシーンIDのAR重畳表示定義データがある場合
			if(_markerId == null){ // マーカーIDの指定がない場合、シーン全てのAR重畳表示定義データを設定します。
				for(marker in _superimposedgraphics[_sceneId]){
					//ARマーカーの座標系を作成してマーカーIDを指定
					var coordinateSystem = new AR.Renderer.FJARMarkerCoordinateSystem();
					coordinateSystem.setValue(parseInt(marker));
					try{
						//対象マーカーIDのARコンテンツを削除
						//ネイティブAR表示層にAR重畳表示定義データを設定します。
						AR.Renderer.put(coordinateSystem, _superimposedgraphics[_sceneId][parseInt(marker)], Tenken.Util.noop, contenstPutError);
					} catch (e){
						Tenken.Util.logerr(e);
					}
				}
			} else if(_superimposedgraphics[_sceneId][_markerId] != null) { //指定したマーカーIDのAR重畳表示定義データがある場合
				//ARマーカーの座標系を作成してマーカーIDを指定
				var coordinateSystem = new AR.Renderer.FJARMarkerCoordinateSystem();
				coordinateSystem.setValue(_markerId);
				try{
					//対象マーカーIDのARコンテンツを削除
					//ネイティブAR表示層にAR重畳表示定義データを設定します。
					AR.Renderer.put(coordinateSystem, _superimposedgraphics[_sceneId][_markerId], Tenken.Util.noop, contenstPutError);
				} catch (e){
					Tenken.Util.logerr(e);
				}
			}
		}
	};

  /**
   * 指定されたシーンID、マーカーIDのAR重畳定義データ、設備名および
   * 申し送りをAR表示層に追加します。
   * @param {Object} _superimposedgraphics AR重畳定義データ
   * @param {Number} _sceneId AR重畳定義データを登録するシーンID
   * @param {Number} _markerId AR重畳定義データを登録するマーカーID
   *                           nullの場合は全マーカーIDを登録。
   * @param {Array} _assetlist 設備データ配列
   *                           null指定または配列が0個の場合は登録しません。
   * @param {Array} _msglists  申し送りデータ配列
   *                           null指定または配列が0個の場合は登録しません。
   * @param {function} _funcTapActionAsset 設備名タップ時起動Function
   * @param {function} _funcTapActionMsg   申し送りップ時起動Function
   * @return なし
   */
	this.createSuperimposedGraphicsAssetAndMsg = function(_superimposedgraphics, _sceneId, _markerId, _assetlist, _msglists, _funcTapActionAsset, _funcTapActionMsg)
	{
	try
	{
		// 画面解像度から申し送り、設備名の重畳表示のサイズを求める。
		// ただし、0.2～1.0の範囲に収める。
		var sX = window.screen.width;
		var sY = window.screen.height;
		sizeX = sX / 5120;
		sizeY = sY / 3200;
		if ( sizeX < 0.2 || sizeX > 1.0 ) sizeX = 0.5;
		if ( sizeY < 0.2 || sizeY > 1.0 ) sizeY = 0.5;
		sizeZ = sizeX;

		var coordsSyss = []; // 入れ物を用意するだけ。Scene#setCoordinateSystems()等は、graphic生成処理が成功してから実施する。そうでないと、空のcoordinateSystemができてしまうだめ
		var graphicsS = [];

		// シナリオ･シーンの重畳定義データ
		if ( null != _superimposedgraphics )
		{
			if(_superimposedgraphics[_sceneId] != null){ // 指定したシーンIDのAR重畳表示定義データがある場合
				if(_markerId == null){ // マーカーIDの指定がない場合、シーン全てのAR重畳表示定義データを設定します。
					for(marker in _superimposedgraphics[_sceneId]){
						//ARマーカーの座標系を作成してマーカーIDを指定
						var coordinateSystem = new AR.Renderer.FJARMarkerCoordinateSystem();
						coordinateSystem.setValue(parseInt(marker));
						graphicsS.push({markerid:parseInt(marker), graphics:_superimposedgraphics[_sceneId][parseInt(marker)].concat([])});
					}
				} else if(_superimposedgraphics[_sceneId][_markerId] != null) { //指定したマーカーIDのAR重畳表示定義データがある場合
					//ARマーカーの座標系を作成してマーカーIDを指定
					var coordinateSystem = new AR.Renderer.FJARMarkerCoordinateSystem();
					coordinateSystem.setValue(_markerId);
					graphicsS.push({markerid:_markerId, graphics:_superimposedgraphics[_sceneId][_markerId].concat([])});

				}
			}
		}

		// 設備
		if ( null != _assetlist )
		{
			for(var j = (_assetlist.length - 1); j >= 0; j--)
			{
				var asset = _assetlist[j];
				if( null == asset.markerid || 1 > asset.markerid) continue; // markeridが無効なものは表示しない

				var tmpgraphics = [];
				var found = 0;
				for(var k = 0; k < graphicsS.length; k++)
				{
					tmpgraphics = graphicsS[k].graphics;
					if ( asset.markerid == graphicsS[k].markerid )
					{
						found  = 1;
						break;
					}
				}
				if ( 0 != found )
				{
					var graphics = tmpgraphics;
				}
				else
				{
					var graphics = []; // ここも、入れ物だけ用意
					graphicsS.push({markerid:asset.markerid, graphics:graphics});
				}
				var funcAsset = _funcTapActionAsset + "(" + asset.markerid + ")";

				// 設備の名前のgraphic
				graphics.push(
					createEZSuperimposedGraphic(
						"asset"/*_name*/,
						createPoint(null/*_id*/, 0/*_x*/, -0.5/*_y*/, 0/*_z*/)/*_translation*/,
						createDirectorAction(/*_clickAction*/
								null/*_id*/,
								funcAsset/*_expression*/),
								createAssetNameGraphic(/*_graphic*/
									asset.assetname/*_name*/)
					)
				);
			}
		}

		// 申し送り
		if ( null != _msglists )
		{
			// 新しいものが最上位で描画されるよう、古いもの順に書いていく
			for(var i = (_msglists.length - 1); i >= 0; i--)
			{
				var msgs = _msglists[i];
				if(null == msgs) continue;
				// 新しいものが最上位で描画されるよう、古いもの順に書いていく
				for(var j = (msgs.length - 1); j >= 0; j--)
				{
					var msg = msgs[j];

					var tmpgraphics = [];
					var found = 0;
					for(var k = 0; k < graphicsS.length; k++)
					{
						tmpgraphics = graphicsS[k].graphics;
						if ( msg.markerid == graphicsS[k].markerid )
						{
							found  = 1;
							break;
						}
					}
					if ( 0 != found )
					{
						var graphics = tmpgraphics;
					}
					else
					{
						var graphics = []; // ここも、入れ物だけ用意
						graphicsS.push({markerid:msg.markerid, graphics:graphics});
					}

						var funcMsg = _funcTapActionMsg + "(" + ((null == msg.msgid) ? "null" : ("'" + msg.msgid + "'")) + ", " + msg.occurrencetime + ")";
					var level = msg.level;
					if(level < 9) {
						graphics.push(
							createEZSuperimposedGraphic(
								"message"/*_name*/,
								createPoint(null, msg.x, msg.y, msg.z)/*_translation*/,
								createDirectorAction(/*_clickAction*/
									null/*_id*/,
									funcMsg/*_expression*/), // 申し送り一覧を表示
								createMessageGraphic(/*_graphic*/
									new Tenken.DatetimeValue(msg.occurrencetime).toString()/*_datetime*/,
									msg.operator/*_operator*/,
									msg.title /*_message*/)
							)
						);
					}
					else {
						graphics.push(
							createEZSuperimposedGraphic(
								null,
								createPoint(null, msg.x, msg.y, msg.z)/*_translation*/,
								createDirectorAction(/*_clickAction*/
									null/*_id*/,
									funcMsg/*_expression*/), //申し送り一覧を表示
 								createCautionGraphic(/*_graphic*/
									new Tenken.DatetimeValue(msg.occurrencetime).toString()/*_datetime*/,
									msg.operator/*_operator*/,
									msg.title /*_message*/)
							)
						);
					}
				}
			}

		}

		var lenSG=0;
		for ( var i=0 ; i < graphicsS.length ; i++ )
		{
			if ( null != graphicsS[i].graphics )
			{
				lenSG += graphicsS[i].graphics.length
			}
		}
		if ( 100 < lenSG )
		{
			var strOver="AR重畳表示定義データ登録警告\n\n同一シーンには100件までのAR重畳表示定義データしか表示できません\n";
		if ( null != _assetlist || null != _msglists )
		{
			strOver += "また、件数にはマーカーID(設備)毎の設備名と申し送りデータも含みます。\n";
		}
		strOver += "シナリオやシーンを分ける、AR重畳表示定義データを減らす、設備名を表示しない(シーン備考欄の#TENKEN#を削除する)。申し送りデータの完了報告する等を実施して表示数を減らしてださい。\n";
		strOver += "\n登録処理を続行しますが、正常表示されない場合があります。\n件数=" + lenSG;

			alert(strOver);
		}

		// 登録処理
		for(var k = 0; k < graphicsS.length ; k++)
		{
			var graphics = graphicsS[k].graphics;

			var coordsSys = createEZFJARMarkerCoordinateSystem(graphicsS[k].markerid)
			if ( null != coordsSys )
			{
				var tmpGraphics = [];

				//ネイティブAR表示層にAR重畳表示定義データを設定します。
				AR.Renderer.put(coordsSys, Tenken.putEach(tmpGraphics, graphics, false), Tenken.Util.noop, contenstPutError );
			}
		}
	} catch (e){
		alert("Exception: createSuperimposedGraphicsAssetAndMsg \n" + e);
		Tenken.Util.logerr(e);
	}
	};

	/* 事前ロードが正常終了したら、AR重畳表示をクリアする */
	successPreload = function(_result)
	{
		// AR重畳表示をクリア
		AR.Renderer.clear(Tenken.Util.noop,Tenken.Util.noop);
	}

	/** 事前にロードするAR重畳表示定義データをネイティブの描画レイヤに設定します。 */
	this.createSuperimposedGraphicsPreload = function(_superimposedgraphics)
	{
		if ( 0 < _superimposedgraphics.length )
		{
			//ARマーカーの座標系を作成してマーカーID(ダミー用に99固定利用)を指定
			var coordinateSystem = new AR.Renderer.FJARMarkerCoordinateSystem();
			coordinateSystem.setValue(99);
			try{
				//ネイティブAR表示層にAR重畳表示定義データを設定します。
				AR.Renderer.put(coordinateSystem, _superimposedgraphics, successPreload, contenstPutError);
			} catch (e){
				alert("Exception:createSuperimposedGraphicsPreload\n" + e);
				Tenken.Util.log(e);
			}
		}
	};

};
