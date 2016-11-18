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

import java.io.File;
import java.util.ArrayList;
import java.util.Map;

/**
 * ユーザが指定した出力項目設定ファイルで定義された、出力対象の点検項目情報を格納するクラス
 */
public class TenkenDataMap {
	private String urlBase;
	private String mapPath;
	private Map<String, String> options;

	private String tableName = "tenkentable";
	private String[] colNames = {"targetassetid", "type"};
	private String[] keys = {"AssetId", "TenkenType"};
	private String entry = "DataEntryName";
	private ArrayList<String> header = new ArrayList<String>();
	private ArrayList<ArrayList<String>> tenkenDataMap = new ArrayList<ArrayList<String>>();

	private boolean isValid = false;

	// TODO move to message resource file
	private static final String MSG_SPECIFIED_KEY_COLUMN_NOT_FOUND = "specified key column in tenken item file is not found";
	private static final String MSG_EMPTY_TENKEN_ITEM_FILE = "empty tenken item file";
	private static final String MSG_ERROR_INVALID_TENKENTABLE_DATA = "invalid tenkentable data";

//	public TenkenDataMap(String urlBase, String mapPath, Map<String, Boolean> flags) {
//		this.urlBase = urlBase;
//		this.mapPath = mapPath;
//		this.flags = flags;
//		create();
//	}

	/**
	 * constructor
	 * @param urlBase 接続先のARサーバのアドレス
	 * @param mapPath 出力項目設定ファイルの絶対パス
	 * @param options 拡張設定用のパラメタをまとめたもの。key, valueともStringのMap
	 */
	public TenkenDataMap(String urlBase, String mapPath, Map<String, String> options) {
		this.urlBase = urlBase;
		this.mapPath = mapPath;
		this.options = options;

		create();
	}

	/**
	 * 出力項目設定ファイルで指定された項目について、
	 * 点検項目管理テーブル(tenkentable)に定義された情報と照合して出力項目のマップデータを作成する
	 */
	private void create() {
//		ArTableData tableData = new ArTableData(urlBase, tableName, null, "occurrencetime", flags);
		ArTableData tableData = new ArTableData(urlBase, tableName, 0, Long.MAX_VALUE, options);

		Map<String, Integer> attrMap = tableData.getAttributePosMap();
		ArrayList<String[]> values = tableData.getValues();

		ArrayList<Integer> keyCols = new ArrayList<Integer>();
		for (int i = 0; i < keys.length; i++) {
			header.add(colNames[i]);
			Integer keyCol = attrMap.get(keys[i]);
			if (null == keyCol) {
				// this case is internal data error, so abort process
				System.out.println(MSG_ERROR_INVALID_TENKENTABLE_DATA);
				System.exit(1);
			}
			keyCols.add(keyCol);
		}
		header.add("QAttribute");
		header.add("dispName");

		Integer entryCol = attrMap.get(entry);
		if (null == entryCol) {
			// this case is internal data error, so abort process
			System.out.println(MSG_ERROR_INVALID_TENKENTABLE_DATA);
			System.exit(1);
		}

		ArrayList<String[]> inMap = readMap();
		if (inMap.size() == 0) {
			// this was already checked therefore can't reach here
			System.out.println(MSG_EMPTY_TENKEN_ITEM_FILE);
			isValid = false;
			return;
		}
		isValid = Util.checkMapFile(inMap, mapPath, 0, true);
		if (!isValid) {
			System.out.println(MSG_EMPTY_TENKEN_ITEM_FILE);
			return;
		}
		String[] inHeader = inMap.get(0);
		/* cannot reach here */
		if (inHeader.length == 0) {
			System.out.println(MSG_EMPTY_TENKEN_ITEM_FILE);
			isValid = false;
			return;
		}
		/* cannot reach here end */
		String idName = inHeader[0];
		Integer idCol = attrMap.get(idName);
		if (null == idCol) {
			System.out.println(MSG_SPECIFIED_KEY_COLUMN_NOT_FOUND);
			isValid = false;
			return;
		}

		for (int i = 1; i < inMap.size(); i++) {
			ArrayList<String> line = new ArrayList<String>();
			String[] inLine = inMap.get(i);
			if (inLine.length != 2) {
				Util.processInvalidSetting(mapPath, i, inLine);
				continue;
			}
			String id = inLine[0];
			for (int j = 0; j < values.size(); j++) {
				boolean isValidLine = true;
				String[] record = values.get(j);
				String temp = record[idCol];
				if (record.length <= idCol) {
					Util.processInvalidSetting("tenkentable", j, record);
					continue;
				}
				if (null == temp || 0 == temp.length()) {
					Util.processInvalidSetting("tenkentable", j, record);
					continue;
				}
				if (temp.equals(id)) {
					for (int k = 0; k < keys.length; k++) {
						int col = keyCols.get(k).intValue();
						if (record.length <= col) {
							Util.processInvalidSetting("tenkentable", j, record);
							isValidLine = false;
							break;
						}
						line.add(record[col]);
					}
					if (record.length <= entryCol.intValue()) {
						Util.processInvalidSetting("tenkentable", j, record);
						continue;
					}
					line.add(record[entryCol.intValue()]);
					line.add(inLine[1]);
					if (isValidLine) {
						tenkenDataMap.add(line);
					}
					if (!isValid) {
						isValid = true;
					}
					break;
				}
			}
		}
	}

	/**
	 * 
	 * @return 出力項目設定ファイルの内容
	 */
	private ArrayList<String[]> readMap () {
		File mapFile = new File(mapPath);
		if (!mapFile.canRead()) {
			isValid = false;
			return new ArrayList<String[]>();
			// could not read map file
//			Exception e = new Exception("cannot read tenken item file");
//			e.printStackTrace();
//			System.exit(1);
		}

		ArrayList<String[]> map = CSVReader.readCsvFile(mapPath);
		if (map.size() <= 1) {
			isValid = false;
			// empty map file
//			Exception e = new Exception("empty tenken item file");
//			e.printStackTrace();
//			System.exit(1);
		} else {
			isValid = Util.checkMapFile(map, mapPath, 0, true);
		}
		return map;
	}

	/**
	 * 
	 * @return 点検項目のマップデータ（本コンポーネントの内部形式に変換済み）のヘッダ
	 */
	public ArrayList<String> getHeader() {
		return header;
	}

	/**
	 * 
	 * @return 点検項目のマップデータ（本コンポーネントの内部形式に変換済み）の本体
	 */
	public ArrayList<ArrayList<String>> getMap() {
		return tenkenDataMap;
	}

	/**
	 * @return 出力項目設定ファイルとして有効かどうか。true: 有効、false: 無効
	 */
	public boolean isValidFile() {
		return isValid;
	}
}
