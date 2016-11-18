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

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

/**
 * 点検項目管理テーブル(tenkentable)から取り出した点検項目のマップデータのクラス
 */
public class TenkenTable {
	private String urlBase;
	private Map<String, String> options;

	private String tableName = "tenkentable";
	private String[] colNames = {"targetassetid", "type"};
	private String[] keys = {"AssetId", "TenkenType"};
	private String entry = "DataEntryName";
	private String disp = "RowName";
	private ArrayList<String> header = new ArrayList<String>();
	private String sortKey = "TargetNo";
	private ArrayList<ArrayList<String>> map = new ArrayList<ArrayList<String>>();

	// TODO move to message resource file
	private static final String MSG_ERROR_TARGETNO_DUPLICATED
	 = "Duplicated target number was specified. CSV output process was aborted.\n";
//	public TenkenTable(String urlBase, Map<String, Boolean> flags) {
//		this.dir = dir;
//		this.urlBase = urlBase;
//		this.flags = flags;
//		create();
//	}

	/**
	 * constructor
	 * 
	 * @param urlBase 接続先のARサーバのアドレス
	 * @param options 拡張設定用のパラメタをまとめたもの。key, valueともStringのMap
	 */
	public TenkenTable(String urlBase, Map<String, String> options) {
		this.urlBase = urlBase;
		this.options = options;

		create();
	}

	private void create() {
//		ArTableData tableData = new ArTableData(urlBase, tableName, null, "occurrencetime", flags);
		ArTableData tableData = new ArTableData(urlBase, tableName, 0, Long.MAX_VALUE, options);

		Map<String, Integer> attrMap = tableData.getAttributePosMap();
		ArrayList<String[]> values = tableData.getValues();

		ArrayList<Integer> keyCols = new ArrayList<Integer>();
		for (int i = 0; i < colNames.length; i++) {
			header.add(colNames[i]);
			keyCols.add(attrMap.get(keys[i]));
		}
		header.add("QAttribute");
		header.add("dispName");

		/* sort by TargetNo value start */
		Integer sortRow = attrMap.get(sortKey);
		if (null == sortRow) {
			// this case is internal data error, so abort process
			Exception e = new Exception("invalid tenkentable data");
			e.printStackTrace();
			System.exit(1);
		}
		Map<Long, Integer> orderMap = new HashMap<Long, Integer>();
		ArrayList<Long> targetNos = new ArrayList<Long>();
		for (int i = 0; i < values.size(); i++) {
			String[] tableRecord = values.get(i);
			if (tableRecord.length <= sortRow) {
				Util.processInvalidSetting("tenkentable", i, tableRecord);
				continue;
			}
			Long targetNo = null;
			String targetNoStr = tableRecord[sortRow];
			if (null == targetNoStr || targetNoStr.length() == 0) {
				continue;
			}
			try {
				targetNo = new Long(tableRecord[sortRow]);
			} catch (NumberFormatException e) {
				continue;
			}
			if (0 == targetNo.longValue()) {
				continue;
			}
			/* targetNo duplication check */
			Integer check = orderMap.get(targetNo);
			if (check != null) {
				String msg = MSG_ERROR_TARGETNO_DUPLICATED
					+ "tenkentable record: " + i + ", target number: " + targetNo; 
				System.out.println(msg);
				System.exit(1);
			}
			/* targetNo duplication check end */
			orderMap.put(targetNo, new Integer(i));
			targetNos.add(targetNo);
		}
		Long[] array = new Long[targetNos.size()];
		for (int i = 0; i < targetNos.size(); i++) {
			array[i] = targetNos.get(i);
		}
		Arrays.sort(array);

		ArrayList<String[]> sorted = new ArrayList<String[]>();
		for (int i = 0; i < array.length; i++) {
			Integer row = orderMap.get(array[i]);
			sorted.add(values.get(row.intValue()));
		}
		/* sort by TargetNo value end */

		Integer entryCol = attrMap.get(entry);
		Integer nameCol = attrMap.get(disp);
		if (null == entryCol || null == nameCol) {
			// this case is internal data error, so abort process
			Exception e = new Exception("invalid tenkentable data");
			e.printStackTrace();
			System.exit(1);
		}
		for (int i = 0; i < sorted.size(); i++) {
			String[] tableRecord = sorted.get(i);
			ArrayList<String> line = new ArrayList<String>();
			boolean isValidLine = true;

			for (int j = 0; j < colNames.length; j++) {
				int col = keyCols.get(j).intValue();
				if (tableRecord.length <= col) {
					Util.processInvalidSetting("tenkentable", i, tableRecord);
					isValidLine = false;
					break;
				}
				line.add(tableRecord[col]);
			}
			if (tableRecord.length <= entryCol.intValue()
					|| tableRecord.length <= nameCol.intValue()) {
				Util.processInvalidSetting("tenkentable", i, tableRecord);
				continue;
			}
			line.add(tableRecord[entryCol.intValue()]);
			line.add(tableRecord[nameCol.intValue()]);
			if (isValidLine) {
				map.add(line);
			}
		}
	}

	/**
	 * 
	 * @return 点検項目のマップデータのヘッダ
	 */
	public ArrayList<String> getHeader() {
		return header;
	}

	/**
	 * 
	 * @return 点検項目のマップデータ本体。Stringの2次元ArrayList
	 */
	public ArrayList<ArrayList<String>> getMap() {
		return map;
	}
}
