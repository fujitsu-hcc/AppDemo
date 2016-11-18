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
import java.util.Arrays;
import java.util.Calendar;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * 点検結果テーブルから取得した点検結果を、1回の点検を1レコードとして保持するクラス
 */
public class TenkenEvent {
	private String tenkenTable = "tenkenevent";
	private String tenkenid = "occurrencetime";
	private short keyCount = 2;
	private String tenkentime = "occurrencetime";
	private ArrayList<String[]> dataMap;
	private ArrayList<String[]> baseDataMap;

	private int timeColCsv = 0;

	private static final String[][] baseDataDefault
		= {{"targetassetid","type","QAttribute","dispname"}};

	private boolean isDebug = false;
	private boolean outputAll = false;
	private boolean lastValueUnitRow = false;

	private String urlBase;
	private String dir;
	private Date date;
	private int period = Calendar.DATE;
	private Map<String, String> options;

	private ArrayList<String> header;
	private ArrayList<ArrayList<String>> body;
	private ArrayList<Long> timeList;
	private Map<Long, Integer> timeRowMap;
	private Map<Integer, Long> rowTimeMap;
	/* add operator output start */
	private String opeItem = "operator";
	private static String strOpeHeader = "点検者";
	private ArrayList<String> opeHeader;
	private ArrayList<ArrayList<String>> allOpes;
	/* add operator output end */
	private String scenItem = "ScenarioId";

	private boolean isEmptyRecord = true;

	// TODO move to message resource file
	private static final String MSG_ERROR_CANNOT_READ_TENKEN_MAP_FILE = "cannot read tenken map file";
	private static final String MSG_ERROR_EMPTY_TENKEN_MAP_FILE = "empty tenken map file";
	private static final String MSG_BASE_MAP_EMPTY = "base data map file is empty. output CSV file ignoring it";
	/**
	 * constructor
	 * @param urlBase 接続先のARサーバのアドレス
	 * @param dir 点検項目のマップデータの存在するディレクトリ（絶対パス）
	 * @param date 対象日
	 * @param options 拡張設定用のパラメタをまとめたもの。key, valueともStringのMap
	 */
	public TenkenEvent(String urlBase, String dir, Date date, Map<String, String> options) {
		this.urlBase = urlBase;
		this.dir = dir;
		this.date = date;
		this.options = options;

		// set hidden options
		if (null != options) {
			String debugVal = options.get("debug");
			if (null != debugVal) {
				isDebug = (new Boolean(debugVal)).booleanValue();
			}
			String allVal = options.get("outputAll");
			if (null != allVal) {
				outputAll = (new Boolean(allVal)).booleanValue();
			}
			String lastValueUnit = options.get("lastvalueunit");
			if (null != lastValueUnit && lastValueUnit.equals("row")) {
				lastValueUnitRow=true;
			}

			String periodval = options.get("period");
			if ("week".equalsIgnoreCase(periodval)) {
				period = Calendar.WEEK_OF_YEAR;
			} else if ("month".equalsIgnoreCase(periodval)) {
				period = Calendar.MONTH;
			}
		}

		load();
	}

	private void load () {

		dataMap = readMap(dir);
		this.header = createHeader();
		baseDataMap = readBaseDataMap(dir);
		loadTenkenResult();
		if (isDebug) {
			System.out.println(this.header);
			System.out.println(this.body);
			System.out.println(this.timeList);
			System.out.println(this.timeRowMap);
		}
	}

	private ArrayList<String[]> readMap (String dir) {
		String mapPath = dir + File.separator + "tenkendatamap.csv";
		File mapFile = new File(mapPath);

		if (!mapFile.canRead() || !mapFile.isFile()) {
			// could not read map file
			Exception e = new Exception(MSG_ERROR_CANNOT_READ_TENKEN_MAP_FILE);
			e.printStackTrace();
			System.exit(1);
		}

		ArrayList<String[]> map = CSVReader.readCsvFile(mapPath);
		if (map.size() <= 1) {
			// empty map file
			Exception e = new Exception(MSG_ERROR_EMPTY_TENKEN_MAP_FILE);
			e.printStackTrace();
			System.exit(1);
		}
		/* check tenken data map and remove invalid line */
		boolean isValid = Util.checkMapFile(map, mapPath, keyCount, false);
		/* check tenken data map and remove invalid line end */
		// if no valid line in tenken data map, process is stopped
		if (!isValid) {
			// empty map file
			Exception e = new Exception(MSG_ERROR_EMPTY_TENKEN_MAP_FILE);
			e.printStackTrace();
			System.exit(1);
		}

		return map;
	}

	private ArrayList<String[]> readBaseDataMap (String dir) {
		ArrayList<String[]> baseMapDefault = new ArrayList<String[]>();
		for (int i = 0; i < baseDataDefault.length; i++) {
			baseMapDefault.add(baseDataDefault[i]);
		}

		String mapPath = dir + File.separator + "basedatamap.csv";
		File mapFile = new File(mapPath);
		if (!mapFile.canRead() || !mapFile.isFile()) {
			// no map file, use default data
			return baseMapDefault;
		}

		ArrayList<String[]> map = CSVReader.readCsvFile(mapPath);
		if (map.size() <= 1) {
			// empty map file, use default data
			System.out.println(MSG_BASE_MAP_EMPTY);
			return baseMapDefault;
		}
		/* check base data map and remove invalid line */
		boolean isValid = Util.checkMapFile(map, mapPath, keyCount, false);
		/* check base data map and remove invalid line end */
		// if no valid line in base data map, ignore it
		if (!isValid) {
			System.out.println(MSG_BASE_MAP_EMPTY);
			return baseMapDefault;
		}
		return map;
	}

	private ArrayList<String> getTenkenKeys() {
		ArrayList<String> keys = new ArrayList<String>();
		String[] headers = dataMap.get(0);
		for (int i = 0; i < keyCount && i < headers.length; i++) {
			keys.add(headers[i]);
		}
		return keys;
	}

	private ArrayList<String> createHeader() {
		ArrayList<String> header = new ArrayList<String>();
		for (int i = 1; i < dataMap.size(); i++) {
			String label = "";
			String[] line = dataMap.get(i);
			if (keyCount+1 < line.length) {
				label = line[keyCount+1];
			}
			header.add(label);

			if (keyCount < line.length && tenkentime.equals(line[keyCount])) {
				timeColCsv = i-1;
			}
		}
		return header;
	}

	private String getTenkenid(ArrayList<String[]> def) {
		if (def.size() < 2) {
			return tenkenid;
		}
		String[] header = def.get(1);
		if (header.length <= keyCount) {
		return tenkenid;
		}
		String row = header[keyCount];
		if (null == row || "".equals(row)) {
			return tenkenid;
		}
		return row;
	}

	private void loadTenkenResult() {
		ArrayList<String> keys = getTenkenKeys();

		long fromTime = 0;
		long toTime = Long.MAX_VALUE;
		if (null != date) {
			Calendar cal = Calendar.getInstance();
			cal.setTime(date);
			fromTime = cal.getTimeInMillis();
			cal.add(period, 1);
			toTime = cal.getTimeInMillis()-1;
		}
		ArTableData tableData = new ArTableData(urlBase, tenkenTable, fromTime, toTime, options);
		Map<String, Integer> attrMap = tableData.getAttributePosMap();
		ArrayList<String[]> tenkenRaw = tableData.getValues();

		if ( lastValueUnitRow != true )
		{
			/* １点検項目(Row)単位でマージせず、設備単位のセットで点検値を */
			/* 設定するため、 同じ点検日の同一シナリオ、設備、点検タイプの */
			/* 場合、点検日時が古い結果レコードを削除する */
			try
			{
				int indexAssetId= attrMap.get("targetassetid");
				int indexType= attrMap.get("type");
				int indexScenarioId= attrMap.get("ScenarioId");
				int indexOccTime= attrMap.get("occurrencetime");

				int sizeTenkenRaw=tenkenRaw.size();
				for (int za = sizeTenkenRaw - 1 ; za >= 0 ; za--)
				{
					String[] record1 = tenkenRaw.get(za);
					for (int zb = 0; null != record1  && zb < sizeTenkenRaw  ; zb++)
					{
						if( za == zb ) continue;
						String[] record2 = tenkenRaw.get(zb);

						if (record1[indexAssetId].equals(record2[indexAssetId]) &&
							record1[indexType].equals(record2[indexType]) &&
							record1[indexScenarioId].equals(record2[indexScenarioId]) )
						{
							if ( Long.parseLong(record1[indexOccTime]) <= Long.parseLong(record2[indexOccTime]) )
							{
								tenkenRaw.remove(za);
								sizeTenkenRaw--;
								record1=null;
							}
						}
					}
				}
			}
			catch (NullPointerException e)
			{
			}
		}

		tenkenid = getTenkenid(baseDataMap);

		Map<String, Integer> tenkenidMap = new HashMap<String, Integer>();
		Map<Integer, Integer> recMap = new HashMap<Integer, Integer>();
		Map<Integer, Integer> invRecMap = new HashMap<Integer, Integer>(); // partial sending problem fix
		/* add operator output start */
		Map<Integer, String> opeMap = new HashMap<Integer, String>();
		Integer opeColObj = attrMap.get(opeItem);
		int opeCol;
		if (null == opeColObj) {
			opeCol = -1;
		} else {
			opeCol = opeColObj.intValue();
		}
		/* add operator output end */
		int idCol = 0;
		Integer columnObj = attrMap.get(tenkenid);
		if (null != columnObj) {
			idCol = columnObj.intValue();
		}
		int grpCount = 0;
		for (int recCount = 0; recCount < tenkenRaw.size(); recCount++) {
			String[] record = tenkenRaw.get(recCount);
			if (record.length < idCol) {
				continue;
			}
			String id = record[idCol];
			Integer grpId = tenkenidMap.get(id);
			if (null == grpId) {
				tenkenidMap.put(id, new Integer(grpCount));
				recMap.put(new Integer(recCount), new Integer(grpCount));
				invRecMap.put(new Integer(grpCount), new Integer(recCount));
				/* add operator output start */
				if (opeCol >= 0 && opeCol < record.length) {
					opeMap.put(new Integer(grpCount), record[opeCol]);
				}
				/* add operator output end */
				grpCount++;
			} else {
				recMap.put(new Integer(recCount), grpId);
			}
		}

		/* specify key columns from tenken event table start */
		ArrayList<Integer> keyCols = new ArrayList<Integer>();
		for (int i = 0; i < keyCount; i++) {
			keyCols.add(attrMap.get(keys.get(i)));
		}
		/* specify key columns from tenken event table end */

		int scenCol = 0;
		Integer scenObj = attrMap.get(scenItem);
		if (scenObj != null) {
			scenCol = scenObj.intValue();
		}
		/* specify tenken data division from base data map start */
		ArrayList<ArrayList<Integer>> divArr = new ArrayList<ArrayList<Integer>>();
		ArrayList<Integer> initGrp = new ArrayList<Integer>();
		Map<Integer, Integer> scenMap = new HashMap<Integer, Integer>();
		Set<Integer> grpSet = new HashSet<Integer>(); // partial sending problem fix
		/* add operator output start */
		opeHeader = new ArrayList<String>();
		/* add operator output end */
		if (baseDataMap.size() > 1) {
			// using base data map
			for (int j = 1; j < baseDataMap.size(); j++) {
				ArrayList<Integer> div = new ArrayList<Integer>();
				divArr.add(div);
				String value = "";
				String[] mapRecord = baseDataMap.get(j);
				for (int k = 0; k < tenkenRaw.size(); k++) {
					String[] record = tenkenRaw.get(k);
					boolean b = true;
					for (int l = 0; l < keyCount; l++) {
						String keyValue = mapRecord[l];
						if (null == keyValue) {
							keyValue = "";
						}
						if (!keyValue.equals(record[keyCols.get(l)])) {
							b = false;
							break;
						}
					}
					if (b) {
						String colName = mapRecord[keyCount];
						int col = attrMap.get(colName).intValue();
						if (col >= record.length) {
							continue;
						}
						value = record[col];
						Integer obj = tenkenidMap.get(value);
						if (obj != null) {
							/* avoid duplication tenken data ref */
							if (grpSet.contains(obj)) {
								continue;
							}
							/* avoid duplication tenken data ref */
							div.add(obj);
							/* partial sending problem fix start */
							if (scenCol >= record.length) {
								continue;
							}
							String scenStr = record[scenCol];
							if (null != scenStr) {
								try {
									Integer scenO = new Integer(scenStr);
									grpSet.add(obj);
									scenMap.put(scenO, new Integer(j-1));
								} catch (NumberFormatException nfe) {
									// NOP
								}
							}
							/* partial sending problem fix end */
						}
					}
				}
				/* add operator output start */
				if (keyCount+1 < mapRecord.length) {
					opeHeader.add(strOpeHeader + mapRecord[keyCount+1]);
				} else {
					opeHeader.add(strOpeHeader);
				}
				/* add operator output end */
			}
			/* partial sending problem fix start */
			for (int i = 0; i < grpCount; i++) {
				if (grpSet.contains(new Integer(i))) {
					continue;
				}
				Integer lineO = invRecMap.get(new Integer(i));
				if (null == lineO) {
					continue;
				}
				String[] record = tenkenRaw.get(lineO.intValue());
				String scenStr = record[scenCol];
				if (scenCol >= record.length) {
					continue;
				}
				if (null == scenStr || 0 == scenStr.length()) {
					continue;
				}
				Integer scid = null;
				try {
					scid = new Integer(scenStr);
				} catch (NumberFormatException nfe) {
					continue;
				}
				Integer ii = scenMap.get(scid);
				if (null == ii) {
					continue;
				}
				ArrayList<Integer> oneDiv = divArr.get(ii.intValue());
				oneDiv.add(new Integer(i));
			}
			for (int i = 0; i < divArr.size(); i++) {
				ArrayList<Integer> oneDiv = divArr.get(i);
				Object[] tempArr = oneDiv.toArray();
				Arrays.sort(tempArr);
				ArrayList<Integer> sortedDiv = new ArrayList<Integer>();
				for (int j = 0; j < tempArr.length; j++) {
					sortedDiv.add((Integer) tempArr[j]);
				}
				divArr.set(i, sortedDiv);
			}
			/* partial sending problem fix end  */

			// count maximum tenken division
			int maxGrp = 0;
			for (int i = 0; i < divArr.size(); i++) {
				ArrayList<Integer> div = divArr.get(i);
				if (maxGrp < div.size()) {
					maxGrp = div.size();
				}
			}
			// no duplication tenken data ref
//			Set<Integer> usedDiv = new HashSet<Integer>();
//			for (int i = 0; i < maxGrp; i++) {
//				for (int j = divArr.size()-1; 0 <= j; j--) {
//					ArrayList<Integer> div = divArr.get(j);
//					int size = div.size();
//					if (size <= i) {
//						continue;
//					}
//					Integer obj = div.get(size-i-1);
//					if (usedDiv.contains(obj)) {
//						div.remove(size-i-1);
//						if (i+1 < size) {
//							obj = div.get(size-i-2);
//							usedDiv.add(obj);
//						}
//					} else {
//						usedDiv.add(obj);
//					}
//				}
//			}
			// because division table was shrinked, count maximum tenken division again
//			maxGrp = 0;
//			for (int i = 0; i < divArr.size(); i++) {
//				ArrayList<Integer> div = divArr.get(i);
//				if (maxGrp < div.size()) {
//					maxGrp = div.size();
//				}
//			}
			// if no corresponding tenken result division, insert value -1
			for (int i = 0; i < divArr.size(); i++) {
				ArrayList<Integer> div = divArr.get(i);
				int sizeBefore = maxGrp-div.size();
				for (int j = 0; j < sizeBefore; j++) {
					div.add(0, new Integer(-1));
				}
			}
			//ArrayList<Integer> initDiv = new ArrayList<Integer>();
			for (int i = 0; i < maxGrp; i++) {
				for (int j = 0; j < divArr.size(); j++) {
					ArrayList<Integer> div = divArr.get(j);
					initGrp.add(div.get(i));
				}
			}
		/* specify tenken data division from base data map end */
		} else {
			// base data map is empty
			ArrayList<Integer> div = new ArrayList<Integer>();
			divArr.add(div);
			for (int i = 0; i < grpCount; i++) {
				Integer idxObj = new Integer(i);
				div.add(idxObj);
				initGrp.add(idxObj);
			}
			/* add operator output start */
			opeHeader.add(strOpeHeader);
			/* add operator output end */
		}

		ArrayList<ArrayList<String[]>> tenkenGrp = new ArrayList<ArrayList<String[]>>();
		for (int grp = 0; grp < grpCount; grp++) {
			ArrayList<String[]> oneTenken = new ArrayList<String[]>();
			tenkenGrp.add(oneTenken);
		}
		for (int rec = 0; rec < tenkenRaw.size(); rec++) {
			int grpId = recMap.get(new Integer(rec)).intValue();
			ArrayList<String[]> oneTenken = tenkenGrp.get(grpId);
			oneTenken.add(tenkenRaw.get(rec));
		}

		columnObj = attrMap.get(tenkentime);
		int timeCol = 0;
		if (null != columnObj) {
			timeCol = columnObj.intValue();
		}

//		ArrayList<Long> timeList = new ArrayList<Long>();
//		for (int i = 0; i < grpCount; i++) {
//			ArrayList<String[]> oneTenken = tenkenGrp.get(i);
//			try {
//				Long utimeObj = new Long(oneTenken.get(0)[timeCol]);
//				timeList.add(utimeObj);
//			} catch (NumberFormatException nfe) {
//				// NOP
//			}
//		}

		// specify latest tenken result division for each tenken kind (i.e. AM, PM...)
//		int start = 0;
//		int end = count;
//		int latest = 0;
//		long oldTime = 0;
		ArrayList<Integer> latestGrp = new ArrayList<Integer>();
//		int timeRow = attrMap.get(tenkentime);
//		if(!outputAll && grpCount > 0) {
//			for (int i = 0; i < divArr.size(); i++) {
//				long time = 0;
//				ArrayList<Integer> div = divArr.get(i);
//				int tmpIdx = -1;
//				for (int j = 0; j < div.size(); j++) {
//					long newTime = 0;
//					int index = div.get(j).intValue();
//					if (-1 == index) {
//						continue;
//					}
//					ArrayList<String[]> oneTenken = tenkenGrp.get(index);
//					String timeStr = oneTenken.get(0)[timeCol];
//					if(null == timeStr || timeStr.isEmpty()) {
//						continue;
//					}
//					try {
//						newTime = (new Long(timeStr)).longValue();
//					} catch(NumberFormatException nfe) {
//						continue;
//					}
//					if (time < newTime) {
//						tmpIdx = index;
//						time = newTime;
//					}
//				}
//				latestGrp.add(new Integer(tmpIdx));
//			}
//		}

		ArrayList<Integer> effectGrp = null;
		/* does not compress here */
//		if (outputAll) {
			effectGrp = initGrp;
//		} else {
//			effectDiv = latestDiv;
//		}
		/* empty check start */
//		boolean isEmpty = true;
		for (int i = 0; i < effectGrp.size(); i++) {
			int div = effectGrp.get(i);
			if (div >= 0) {
				isEmptyRecord = false;
				break;
			}
		}
		/* empty check end */
		ArrayList<ArrayList<String>> table = new ArrayList<ArrayList<String>>();
		Map<Long, Integer> timeRowMap = new HashMap<Long, Integer>();
		Map<Integer, Long> rowTimeMap = new HashMap<Integer, Long>();
		int divCount;
		if (divArr.isEmpty()) {
			divCount = 1;
		} else {
			divCount = divArr.size();
		}
//		for (int i = start; i < end; i++) {
		for (int i = 0; i < effectGrp.size(); i++) {
			if (0 == grpCount || isEmptyRecord) {
				// do nothing
				break;
			}
			/*  */
			int index = effectGrp.get(i);
			if (-1 == index) {
				table.add(createEmptyLine());
				continue;
			}
			/*  */
			//ArrayList<String[]> oneTenken = tenkenDiv.get(i);
			ArrayList<String[]> oneTenken = tenkenGrp.get(index);
			ArrayList<String> oneResult = new ArrayList<String>();
			for (int j = 1; j < dataMap.size(); j++) {
				String value = "";
				String[] mapRecord = dataMap.get(j);
				for (int k = 0; k < oneTenken.size(); k++) {
					String[] record = oneTenken.get(k);
					boolean b = true;
					boolean isValidRecord = true;
					for (int l = 0; l < keyCount; l++) {
						String keyValue = mapRecord[l];
						if (null == keyValue) {
							keyValue = "";
						}
						if (record.length <= keyCols.get(l)) {
							isValidRecord = false;
							break;
						}
						if (!keyValue.equals(record[keyCols.get(l)])) {
							b = false;
							break;
						}
					}
					if (!isValidRecord) {
						continue;
					}
					if (b) {
						String colName = mapRecord[keyCount];
						Integer colObj = attrMap.get(colName);
						if (null == colObj) {
							break;
						}
						int col = colObj.intValue();
						if (record.length <= col) {
							break;
						}
						value = record[col];
						break;
					}
				}
				oneResult.add(value);
			}
			table.add(oneResult);

			if (oneTenken.get(0).length <= timeCol) {
				continue;
			}
			String timeStr = oneTenken.get(0)[timeCol];
			if(null == timeStr || timeStr.isEmpty()) {
				continue;
			}
			Long timeObj;
			try {
				timeObj = new Long(timeStr);
			} catch(NumberFormatException nfe) {
				continue;
			}
			Integer rowObj = new Integer(i/divCount);
			timeRowMap.put(timeObj, rowObj);
			rowTimeMap.put(rowObj, timeObj);
		}

		ArrayList<ArrayList<String>> mergedTable = new ArrayList<ArrayList<String>>();
		int mergedSize = table.size() / divCount;
		for (int i = 0; i < mergedSize; i++) {
			ArrayList<String> line = new ArrayList<String>();
			mergedTable.add(line);
		}
		for (int i = 0; i < mergedSize; i++) {
			ArrayList<String> mergedLine = mergedTable.get(i);
			for (int j = 0; j < dataMap.size()-1; j++) {
				String value = "";
				for (int k = 0; k < divArr.size(); k++) {
					ArrayList<String> line = table.get(i * divArr.size() + k);
					String tmpVal = line.get(j);
					if (null != tmpVal && !"".equals(tmpVal)) {
						value = tmpVal;
						break;
					}
				}
				mergedLine.add(value);
			}
		}
		/* add operator output start */
		ArrayList<ArrayList<String>> opes = new ArrayList<ArrayList<String>>();
		for (int i = 0; i < mergedSize; i++) {
			ArrayList<String> line = new ArrayList<String>();
			opes.add(line);
		}
		for (int i = 0; i < mergedSize; i++) {
			ArrayList<String> opeLine = opes.get(i);
			for (int k = 0; k < divArr.size(); k++) {
				int index = effectGrp.get(i * divArr.size() + k).intValue();
				if (-1 == index) {
					opeLine.add("");
				} else {
					String operator = opeMap.get(index);
					if (null == operator) {
						opeLine.add("");
					} else {
						opeLine.add(operator);
					}
				}
			}
		}
		/* add operator output end */
		/* partial sending problem fix start */
		if (outputAll) {
			this.body = mergedTable;
			this.allOpes = opes;
		} else {
			ArrayList<String> resultLine = new ArrayList<String>();
			ArrayList<ArrayList<String>> result = new ArrayList<ArrayList<String>>();
			for (int i = 0; i < dataMap.size()-1; i++) {
				boolean b = true;
				for (int j = mergedTable.size()-1; j >= 0 ; j--) {
					ArrayList<String> curLine = mergedTable.get(j);
					String current = curLine.get(i);
					if (null != current && !"".equals(current)) {
						resultLine.add(current);
						b = false;
						break;
					}
				}
				if (b) {
					resultLine.add("");
				}
			}
			result.add(resultLine);
			this.body = result;

			ArrayList<String> opeLine = new ArrayList<String>();
			ArrayList<ArrayList<String>> opeResult = new ArrayList<ArrayList<String>>();
			for (int i = 0; i < divArr.size(); i++) {
				for (int j = mergedTable.size()-1; j >= 0 ; j--) {
					ArrayList<String> curLine = opes.get(j);
					String current = curLine.get(i);
					if (null != current && !"".equals(current)) {
						opeLine.add(current);
						break;
					}
					opeLine.add("");
				}
			}
			opeResult.add(opeLine);
			this.allOpes = opeResult;
		}
		/* partial sending problem fix end */
//		this.timeList = timeList;
		this.timeRowMap = timeRowMap;
		this.rowTimeMap = rowTimeMap;
	}

	private ArrayList<String> createEmptyLine() {
		ArrayList<String> emptyLine = new ArrayList<String>();
		for (int i = 1; i < dataMap.size(); i++) {
			emptyLine.add("");
		}
		return emptyLine;
	}

	/**
	 *
	 * @return ヘッダ
	 */
	public ArrayList<String> getHeader() {
		return header;
	}
	/**
	 *
	 * @return データ本体
	 */
	public ArrayList<ArrayList<String>> getBody() {
		return body;
	}
//	public ArrayList<Long> getTimeList() {
//		return timeList;
//	}
	public Map<Long, Integer> getTimeRowMap() {
		return timeRowMap;
	}
	/**
	 *
	 * @return 出力結果の各レコードと点検時刻の対応のMap
	 */
	public Map<Integer, Long> getRowTimeMap() {
		return rowTimeMap;
	}
	/**
	 *
	 * @return 点検のエポック時刻（ミリ秒単位）を表す列番号（0からスタート）
	 */
	public int getTimeColCsv() {
		return timeColCsv;
	}
	/* add operator output start */
	/**
	 *
	 * @return 点検者の項目の項目名（CSVファイルのヘッダに出力）
	 */
	public ArrayList<String> getOpeHeader() {
		return opeHeader;
	}
	/**
	 *
	 * @return 点検者名
	 */
	public ArrayList<ArrayList<String>> getAllOpes() {
		return allOpes;
	}
	/* add operator output end */
	public boolean isEmptyRecord () {
		return isEmptyRecord;
	}
}
