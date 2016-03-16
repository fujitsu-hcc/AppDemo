/**
 * @overview 点検業務向けJavaScript API群(点検項目帳票定義)です。
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
 * POI集合を点検項目帳票として扱うためのライブラリ空間です。
 */
Tenken.ChecklistForm = {};


/**
 * 値の型の基底クラスです。
 */
Tenken.ChecklistForm.AbstractValueType = function() {};
/**
 * 指定された値が有効か否かを判定して返します。
 * @param {Object} _value 判定対象値
 * @return {Boolean} 有効の場合はtrue、それ以外はfalse
 */
Tenken.ChecklistForm.AbstractValueType.prototype.isValid = function(_value) { return false; };


/**
 * 数値型クラスです。
 * @param {String} _regexp 有効値を判定する正規表現
 * @param {Number} _maxlength 文字列としての最大帳
 */
Tenken.ChecklistForm.NumberType = function(_regexp, _maxlength) {
	Tenken.ChecklistForm.AbstractValueType.call(this);
	this.regexp = _regexp;
	this.maxlength = _maxlength;
};
Tenken.inherit(Tenken.ChecklistForm.NumberType, Tenken.ChecklistForm.AbstractValueType);
/** @extends Tenken.ChecklistForm.AbstractValueType.prototype.isValid */
Tenken.ChecklistForm.NumberType.prototype.isValid = function(_value) {
	if(("number" != typeof(_value)) && ("string" != typeof(_value))) return false;
	return new RegExp(this.regexp).test(_value); // TODO maxlengthとの比較は?
};
/** 数値型。*/
// JavaScriptで対数丸めを起こさず扱える最大桁数が16なので、小数点以上を8, 以下を3とした
//Tenken.ChecklistForm.NUMBERTYPE = new Tenken.ChecklistForm.NumberType("^\\d{1,8}(?:\\.\\d{1,3})?$", 12);
// 先頭に-(マイナス)を利用可能。
//プラスも利用可能にする場合は"^[-\+]?\\d{1,8}(?:\\.\\d{1,3})?$"
// 点検項目の値未入力がある場合でも送信可能な場合は未入力をOKとする。
Tenken.ChecklistForm.NUMBERTYPE = new Tenken.ChecklistForm.NumberType("^-?\\d{1,8}(?:\\.\\d{1,3})?$", 12);

/** 文字列 */
Tenken.ChecklistForm.StringType = function(_regexp, _maxlength) {
	Tenken.ChecklistForm.AbstractValueType.call(this);
	this.regexp = _regexp;
	this.maxlength = _maxlength;
};
Tenken.inherit(Tenken.ChecklistForm.StringType, Tenken.ChecklistForm.AbstractValueType);

// 入力時に１文字以上であればチェックはＯＫ(TRUE)となります。
Tenken.ChecklistForm.StringType.prototype.isValid = function(_value) {
	if(("string" != typeof(_value))) return false;
	return true;
};

// 文字列長は1000バイトまでとしています。
Tenken.ChecklistForm.STRINGTYPE = new Tenken.ChecklistForm.StringType("^.*", 1000);

/**
 * 列挙型クラスです。
 * @param {Tenken.Toggle.EnumType} _enumType 列挙型
 */
Tenken.ChecklistForm.EnumType = function(_enum) {
	Tenken.ChecklistForm.AbstractValueType.call(this);
	this.enum = _enum;
};
Tenken.inherit(Tenken.ChecklistForm.EnumType, Tenken.ChecklistForm.AbstractValueType);
/** @extends Tenken.ChecklistForm.AbstractValueType.prototype.isValid */
Tenken.ChecklistForm.EnumType.prototype.isValid = function(_value) {
	return (null != this.enum.parse(_value));
};
/** 天気列挙値型。*/
Tenken.ChecklistForm.WEATHERTYPE = new Tenken.ChecklistForm.EnumType(Tenken.Toggle.WEATHERTYPE);
/** OK/NG列挙値型。*/
Tenken.ChecklistForm.OKNGTYPE = new Tenken.ChecklistForm.EnumType(Tenken.Toggle.OKNGTYPE);
/** ○×列挙値型。*/
Tenken.ChecklistForm.MARUBATSUTYPE = new Tenken.ChecklistForm.EnumType(Tenken.Toggle.MARUBATSUTYPE);

// 型にマッチした値が設定されているかチェック
// true:正常値 false:設定なしか異常値
Tenken.ChecklistForm.checkValue = function(_valueType, _value)
{
	switch ( _valueType )
	{
	case "NUMBER":
		var ValueTypeObj=Tenken.ChecklistForm.NUMBERTYPE;
		break;
	case "OKNG":
		var ValueTypeObj=Tenken.ChecklistForm.OKNGTYPE;
		break;
	case "WEATHER":
		var ValueTypeObj=Tenken.ChecklistForm.WEATHERTYPE;
		break;
	case "STRING":
		var ValueTypeObj=Tenken.ChecklistForm.STRINGTYPE;
		break;
	case "MARUBATSU":
		var ValueTypeObj=Tenken.ChecklistForm.MARUBATSUTYPE;
		break;
	default:
		alert("サポートされていないValueType=" + _valueType + "が指定されました。\n正しいValueTypeを指定してください\n");
		var ValueTypeObj=null;
		break;
	}

	if( ValueTypeObj && ValueTypeObj.isValid(_value))
	{
		var ret=true;
	}
	else
	{
		var ret=false;
	}

	return(ret);
}
