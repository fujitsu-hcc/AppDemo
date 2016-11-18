/*
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
package tenken.csvexport;

import java.net.HttpURLConnection;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

//import com.fujitsu.cmgr.ar.util.SimpleJson;

/**
 * Interstage AR Serverの利用者定義テーブルに格納された生データを格納するクラス
 */
public class ArTableData {
	private boolean isDebug = false;

	private boolean notNull = false;

	private String urlBase;
	private boolean useSsl = false;
	private String qtypeName;
	private String key = "occurrencetime";
	private int scenarioId = 0;

	private Map<String, String> options = new HashMap<String, String>();

	private ArrayList<String> attrList;
	private Map<String, Integer> attrPosMap;
	private Map<String, String> attrTypeMap;
	private ArrayList<String[]> values;

	/**
	 * constructor
	 *
	 * @param urlBase 接続先ARサーバのアドレス
	 * @param qtypeName 対象とするqType（利用者定義テーブル）名
	 * @param fromTime 開始時刻（ミリ秒単位のエポック時刻）時刻指定しない場合0を指定
	 * @param toTime 終了時刻（ミリ秒単位のエポック時刻）時刻指定しない場合Long.MAX_VALUEを指定
	 * @param options 拡張設定用のパラメタをまとめたもの。key, valueともStringのMap
	 */
	public ArTableData(String urlBase, String qtypeName, long fromTime, long toTime, Map<String, String> options) {
		this.urlBase = urlBase;
		this.qtypeName = qtypeName;
//		this.date = date;
//		this.key = key;

		this.options = options;
		if (null != options) {
			String scenStr = options.get("scenarioId");
			if (null != scenStr) {
				int idTemp;
				try {
					idTemp = (new Integer(scenStr)).intValue();
					// Scenario ID must be between 1 and 9999 (Interstage AR specification)
					if (1 <= idTemp && idTemp <= 9999) {
						scenarioId = idTemp;
					} else {
						Exception e = new Exception("illegal scenario id was specified");
						e.printStackTrace();
						System.exit(1);
					}
				} catch (NumberFormatException e) {
					Exception ee = new Exception("illegal scenario id was specified");
					ee.printStackTrace();
					System.exit(1);
				}
			}
			String sslVal = options.get("useSsl");
			if (null != sslVal) {
				useSsl = (new Boolean(sslVal)).booleanValue();
			}
			String debugVal = options.get("debug");
			if (null != debugVal) {
				isDebug = (new Boolean(debugVal)).booleanValue();
			}
			String notnullVal = options.get("notNull");
			if (null != notnullVal) {
				notNull = (new Boolean(notnullVal)).booleanValue();
			}
		}
		load(fromTime, toTime);
	}

	/**
	 * AR Serverの利用者定義テーブルに格納されているデータを読み込む
	 * @param fromTime 開始時刻（ミリ秒単位のエポック時刻）時刻指定しない場合0を指定
	 * @param toTime 終了時刻（ミリ秒単位のエポック時刻）時刻指定しない場合Long.MAX_VALUEを指定
	 */
	private void load(long fromTime, long toTime) {
		ArrayList<String[]> values = new ArrayList<String[]>();

		// get list of items in user table and their type and put them to Map
		String responsBody;
		int responseCode;
		loadAttributes();
		getAttributeList();
		Map<String, Integer> attrMap = getAttributePosMap();
		Map<String, String> attrType = getAttributeTypeMap();

		String timeCondition = "";
		String scenarioCondition = "";
		String whereExpressions = "";
		String sortOrderExpressions = "";

		Integer keyCol = attrMap.get(key);
		boolean hasCondition = false;
		if (keyCol != null) {
			timeCondition = "{\"qattributeNameRanges\":[{\"start\":\""
				+ key
				+ "\",\"end\":\""
				+ key
				+ "\"}],\"qvalueType\":\"LONG\",\"qvalueRanges\":[{\"start\":"
				+ fromTime
				+ ",\"end\":"
				+ toTime
				+ "}]}";
			sortOrderExpressions = "&sortOrderExpressions=[{\"desc\":true,"
					+ "\"qattributeNameRanges\":[{\"start\":\""
					+ key
					+ "\",\"end\":\""
					+ key
					+ "\"}],\"qvalueType\":\"LONG\",\"qvalueRanges\":[{\"start\":"
					+ fromTime
					+ ",\"end\":"
					+ toTime
					+ "}]}]";
			hasCondition = true;
		}
		if (scenarioId != 0) {
			StringBuilder sb = new StringBuilder("");
			if (hasCondition) {
				sb.append(",");
			}
			String scenarioStr = "{\"qattributeNameRanges\":[{\"start\":\"ScenarioId\",\"end\":\"ScenarioId\"}]"
				+ ",\"qvalueType\":\"LONG\",\"qvalueRanges\":["
				+ "{\"start\":0,\"end\":0},"
				+ "{\"start\":"
				+ scenarioId
				+ ",\"end\":"
				+ scenarioId
				+ "}]}";
			sb.append(scenarioStr);
			scenarioCondition = sb.toString();
			hasCondition = true;
		}
		if (hasCondition) {
			whereExpressions = "&whereExpressions=["
				+ timeCondition
				+ scenarioCondition
				+ "]";
		}

		String expressions = whereExpressions + sortOrderExpressions;

		// count records in specified table
		long urc = countRecord(expressions);
		if (notNull && urc == 0) {
			String msg = "no record matches. table: " + qtypeName + ", expression: " + expressions;
			Exception e = new Exception(msg);
			e.printStackTrace();
			System.exit(1);
		}

		// get all records of specified table and parse them
		for (long l = 0; l < urc; l = l+100) {
			long start = l+1;
			long end = l+100;
			HttpConnCreator c = new HttpConnCreator();
			if (useSsl) {
				c.setUseSsl(useSsl);
			}
			String url = urlBase
					+ "/arsvdm/quads?type=RECORDSANDCOUNT&qtypeNameRanges={\"start\":\""
					+ qtypeName
					+ "\",\"end\":\""
					+ qtypeName
					+ "\"}"
					+ "&limitRange={\"start\":"
					+ start
					+ ",\"end\":"
					+ end
					+ "}&qattributeOrderIndexRange={\"start\":1,\"end\":30}"
					+ expressions;
			c.setURL(url);

			responsBody = c.create("");
			responseCode = c.getResponseCode();
			if (responseCode != HttpURLConnection.HTTP_OK && responseCode != HttpURLConnection.HTTP_CREATED) {
				// could not connect server
				// TODO output error information
				Exception e = new Exception("cannot connect server");
				e.printStackTrace();
				System.exit(1);
			}
//			SimpleJson parser2 = new SimpleJson();
			// 数字文字列だけの項目で範囲外等で例外となった場合は文字列に変換する
			SimpleJson2 parser2 = new SimpleJson2();
			Object json2 = parser2.parse(responsBody);
			if (isDebug) {
			System.out.println(json2);
			}
			if (!(json2 instanceof HashMap)) {
				// TODO output error information
				Exception e = new Exception("invalid data");
				e.printStackTrace();
				System.exit(1);
			}
			Map<String, Object> tableMap = (HashMap<String, Object>)json2;
			Object records2 = tableMap.get("records");
			if (isDebug) {
			System.out.println(records2);
			}
			if (!(records2 instanceof ArrayList)) {
				// TODO output error information
				Exception e = new Exception("invalid data");
				e.printStackTrace();
				System.exit(1);
			}
			ArrayList recordList = (ArrayList)records2;
			for (int i = 0; i < recordList.size(); i++) {
				Object record = recordList.get(i);
				if (isDebug) {
				System.out.println(record);
				}
				if (!(record instanceof HashMap)) {
					continue;
				}
				Map recordMap = (Map)record;
				// check time of this record by id
//				Object id = recordMap.get("id");
//				if (null == id || (!(id instanceof Long))) {
//					continue;
//				}
//				long idTime = ((Long)id).longValue();
//				if (idTime < fromId || toId < idTime) {
					// because time is not specified date, doesn't output this record
//					continue;
//				}

				Object qvalues = recordMap.get("qvalues");
				if (!(qvalues instanceof ArrayList)) {
					continue;
				}
				ArrayList qvArray = (ArrayList)qvalues;
				String[] recordStr = new String[attrMap.size()];
				for (int j = 0; j < qvArray.size(); j++) {
					Object qvalue = qvArray.get(j);
					if(!(qvalue instanceof HashMap)) {
						continue;
					}
					Map qvalMap = (HashMap)qvalue;
					String name = qvalMap.get("qattributeName").toString();
					if (null == name) {
						continue;
					}
					String type = attrType.get(name);
					if (null == type || "".equals(type)) {
						continue;
					}
					String value = "";
					if ("STRING".equalsIgnoreCase(type)) {
						value = qvalMap.get("stringValue").toString();
					} else if ("LONG".equalsIgnoreCase(type)) {
						value = qvalMap.get("longValue").toString();
					} else if ("FLOAT".equalsIgnoreCase(type)) {
						value = qvalMap.get("floatValue").toString();
					}
					int col = attrMap.get(name).intValue();
					recordStr[col] = value;
				}
//				Integer scenCObj = attrMap.get("ScenarioId");
//				if (0 == scenarioId || null == scenCObj) {
				values.add(recordStr);
//				} else {
//					int scenCol = scenCObj.intValue();
//					String scenStr = recordStr[scenCol];
//					int id = -1;
//					try {
//						id = (new Integer(scenStr)).intValue();
//					} catch (NumberFormatException e) {
//						// nop
//					}
//					if (0 == id || id == scenarioId) {
//						values.add(recordStr);
//					}
//				}
			}
		}

		this.values = values;
//		return values;
	}

	/**
	 *
	 * @param expressions クエリパラメタ
	 * @return 検索条件に一致するレコード数(unlimitedRecordCount)
	 */
	private long countRecord(String expressions) {
		String responsBody;
		int responseCode;
		HttpConnCreator cUrc = new HttpConnCreator();
		if (useSsl) {
			cUrc.setUseSsl(useSsl);
		}
		String urlUrc = urlBase
			+ "/arsvdm/quads?type=RECORDSANDCOUNT&qtypeNameRanges={\"start\":\""
			+ qtypeName
			+ "\",\"end\":\""
			+ qtypeName
			+ "\"}"
			+ "&limitRange={\"start\":1,\"end\":1}"
			+ "&qattributeOrderIndexRange={\"start\":1,\"end\":30}"
			+ expressions;
		cUrc.setURL(urlUrc);

		responsBody = cUrc.create("");
		responseCode = cUrc.getResponseCode();
		if (responseCode != HttpURLConnection.HTTP_OK && responseCode != HttpURLConnection.HTTP_CREATED) {
			// could not connect server
			// TODO output error information
			Exception e = new Exception("cannot connect server");
			e.printStackTrace();
			System.exit(1);
		}
//		SimpleJson parserUrc = new SimpleJson();
		// 数字文字列だけの項目で範囲外等で例外となった場合は文字列に変換する
		SimpleJson2 parserUrc = new SimpleJson2();
		Object jsonUrc = parserUrc.parse(responsBody);
		if (isDebug) {
		System.out.println(jsonUrc);
		}
		if (!(jsonUrc instanceof HashMap)) {
			// TODO output error information
			Exception e = new Exception("illegal data");
			e.printStackTrace();
			System.exit(1);
		}
		Map<String, Object> mapUrc = (HashMap<String, Object>)jsonUrc;
		Object urcObj = mapUrc.get("unlimitedRecordCount");
		if (isDebug) {
		System.out.println(urcObj);
		}
		if (!(urcObj instanceof Long)) {
			// TODO output error information
			Exception e = new Exception("illegal data");
			e.printStackTrace();
			System.exit(1);
		}
		long urc = ((Long)urcObj).longValue();
		return urc;
	}

	/**
	 * 検索対象の利用者定義テーブルに存在するQAttributeを取得する
	 */
	private void loadAttributes() {
		ArrayList<String> attrs = new ArrayList<String>();
		Map<String, Integer> attrMap = new HashMap<String, Integer>();
		Map<String, String> attrType = new HashMap<String, String>();

		String urlatr = urlBase
			+ "/arsvdm/qattributes?type=RECORDSANDCOUNT&qtypeNameRanges={\"start\":\""
			+ qtypeName
			+ "\",\"end\":\""
			+ qtypeName
			+ "\"}"
			+ "&limitRange={\"start\":1,\"end\":30}";
		HttpConnCreator c0 = new HttpConnCreator();
		if (useSsl) {
			c0.setUseSsl(useSsl);
		}
		c0.setURL(urlatr);
		String responsBody = c0.create("");
		int responseCode = c0.getResponseCode();
		if (responseCode != HttpURLConnection.HTTP_OK && responseCode != HttpURLConnection.HTTP_CREATED) {
			// could not connect server
			// TODO output error information
			Exception e = new Exception("cannot connect server");
			e.printStackTrace();
			System.exit(1);
		}

//		SimpleJson parser = new SimpleJson();
		// 数字文字列だけの項目で範囲外等で例外となった場合は文字列に変換する
		SimpleJson2 parser = new SimpleJson2();
		Object json = parser.parse(responsBody);
		if (isDebug) {
		System.out.println(json);
		}
		if (!(json instanceof HashMap)) {
			// TODO output error information
			Exception e = new Exception("illegal data");
			e.printStackTrace();
			System.exit(1);
		}
		Map<String, Object> map = (HashMap<String, Object>)json;
		Object records = map.get("records");
		if (!(records instanceof ArrayList)) {
			// TODO output error information
			Exception e = new Exception("illegal data");
			e.printStackTrace();
			System.exit(1);
		}
		ArrayList al = (ArrayList)records;
		for (int i = 0; i < al.size(); i++) {
			Object record = al.get(i);
			if (!(record instanceof HashMap)) {
				continue;
			}
			Map recordMap = (Map)record;
			String name = (String)recordMap.get("name");
			attrMap.put(name, new Integer(i));
			String qvalueType = (String)recordMap.get("qvalueType");
			attrType.put(name, qvalueType);
			attrs.add(name);
		}
		if (isDebug) {
		System.out.println(attrMap);
		System.out.println(attrType);
		}

		if (attrs.isEmpty() || attrMap.isEmpty() || attrType.isEmpty()) {
			String msg = "specified table is empty. table name: " + qtypeName;
			Exception e = new Exception(msg);
			e.printStackTrace();
			System.exit(1);
		}

		this.attrList = attrs;
		this.attrPosMap = attrMap;
		this.attrTypeMap = attrType;
//		Object[] retObjs = {attrs, attrMap, attrType};
//		return retObjs;
	}

//	public void setUseSsl(boolean useSsl) {
//		this.useSsl = useSsl;
//	}

//	public void setDebug(boolean isDebug) {
//		this.isDebug = isDebug;
//	}

//	public void setCanNull(boolean canNull) {
//		this.notNull = canNull;
//	}

//	public static String formatDate(long utime) {
//		Date date = new Date(utime);
//		DateFormat df = new SimpleDateFormat("yyyy/MM/dd HH:mm:ss");
//		return df.format(date);
//	}

	/**
	 *
	 * @return 対象の利用者定義テーブルに定義されているQAttribute名のリスト
	 */
	public ArrayList<String> getAttributeList() {
		return attrList;
	}

	/**
	 *
	 * @return 対象の利用者定義テーブルに定義されているQAttribute名と列番号を対応付けたMap
	 */
	public Map<String, Integer> getAttributePosMap() {
		return attrPosMap;
	}

	/**
	 *
	 * @return 対象の利用者定義テーブルに定義されているQAttribute名とデータ型を対応付けたMap
	 */
	public Map<String, String> getAttributeTypeMap() {
		return attrTypeMap;
	}

	/**
	 *
	 * @return 利用者定義テーブルのデータ本体
	 */
	public ArrayList<String[]> getValues() {
		return values;
	}
}
