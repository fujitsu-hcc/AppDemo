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
import java.util.Calendar;
import java.util.Date;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * 点検結果テーブルから取得した点検結果と申し送りテーブルから取得した申し送りをマージして、
 * <br />1回の点検を1レコードとして保持するクラス
 */
public class TenkenEventMessage {
	private String messageTable = "messageevent";
	private short keyCount = 0;
	private String messagetime = "occurrencetime";
	private ArrayList<String[]> dataMap;

	private static final String[][] msgItemDefault
		= {{"QAttribute","dispname"},
		{"targetassetid","対象機器"},
		{"title","タイトル"},
		{"level","重要度"},
		{"value","内容"},
		{"occurrencetime","発生日時"},
		{"operator","作業者名"}};

	private String messageLabel = "申し送り";
	private int messageMax = 10;

	private static final String NEWLINE = System.getProperty("line.separator");

	private boolean isDebug;

	private String urlBase;
	private String dir;
	private Date date;
	private int period = Calendar.DATE;
	private long fromTime = 0;
	private long toTime = Long.MAX_VALUE;
	private Map<String, String> options;

	private int timeCol;
	private Set<Integer> timeColsSet = new HashSet<Integer>();
	private int msgOffset = 0;

	private ArrayList<Long> timeList;
	private Map<Long, Integer> timeRowMap;
	private Map<Integer, Long> rowTimeMap;

	private ArrayList<String> header;
	private ArrayList<ArrayList<String>> body;
	/* add operator output start */
	private ArrayList<String> opeHeader;
	private ArrayList<ArrayList<String>> allOpes;
	/* add operator output end */

	// TODO move to message resource file
	private static final String MSG_MESSAGE_MAP_EMPTY = "message event map file is empty. output CSV file with default message event item";
	private static final String MSG_ITEM_NOT_IN_MESSAGE_TABLE = "specified item is not in message event table";

	/**
	 * constructor
	 * @param urlBase 接続先のARサーバのアドレス
	 * @param dir 点検項目のマップデータの存在するディレクトリ（絶対パス）
	 * @param date 対象日
	 * @param options 拡張設定用のパラメタをまとめたもの。key, valueともStringのMap
	 */
	public TenkenEventMessage(String urlBase, String dir, Date date, Map<String, String> options) {
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

			String periodval = options.get("period");
			if ("week".equalsIgnoreCase(periodval)) {
				period = Calendar.WEEK_OF_YEAR;
			} else if ("month".equalsIgnoreCase(periodval)) {
				period = Calendar.MONTH;
			}

			String offsetStr = options.get("msgOffset");
			if (null != offsetStr) {
				try {
					int offsetVal = (new Integer(offsetStr)).intValue();
					msgOffset = offsetVal;
				} catch (NumberFormatException e) {
					// nop
				}
			}
		}

		// convert date to range of epoch time
		if (null != date) {
			Calendar cal = Calendar.getInstance();
			cal.setTime(date);
			fromTime = cal.getTimeInMillis();
			cal.add(period, 1);
			toTime = cal.getTimeInMillis()-1;
		}
		load();
	}

	private void load () {
		ArTableData tableData = new ArTableData(urlBase, messageTable, fromTime, toTime, options);
		Map<String, Integer> attrMap = tableData.getAttributePosMap();
		ArrayList<String[]> messageData = tableData.getValues();

		dataMap = readMap(dir);
		TenkenEvent record = new TenkenEvent(urlBase, dir, date, options);
//		this.timeList = record.getTimeList();
		this.timeRowMap = record.getTimeRowMap();
		this.rowTimeMap = record.getRowTimeMap();
		/* add operator output start */
		opeHeader = record.getOpeHeader();
		allOpes = record.getAllOpes();
		String outputOpeStr = options.get("operator");
		boolean outputOpe = false;
		if (null != outputOpeStr) {
			outputOpe = (new Boolean(outputOpeStr)).booleanValue();
		}
		if (outputOpe) {
			msgOffset += opeHeader.size();
		}
		/* add operator output end */
		ArrayList<String> header = mergeHeader(record.getHeader());
		ArrayList<ArrayList<String>> tenkenBody = record.getBody();

		ArrayList<Integer> colList = new ArrayList<Integer>();
		for (int i = 1; i < dataMap.size(); i++) {
			String name = "";
			String[] line = dataMap.get(i);
			if (line.length <= keyCount) {
				continue;
			}
			name = line[keyCount];
			Integer column = attrMap.get(name);
			if (null == column) {
				System.out.println(MSG_ITEM_NOT_IN_MESSAGE_TABLE + " line = " + i);
				colList.add(new Integer(-1));
			}
			colList.add(column);
		}
		ArrayList<Integer> msgCounts = new ArrayList<Integer>();
		for (int i = 0; i < tenkenBody.size(); i++) {
			msgCounts.add(new Integer(0));
		}
		int msgColCount = colList.size();
		Integer timeColObj = attrMap.get(messagetime);
		int timeCol = 0;
		if (null != timeColObj) {
			timeCol = timeColObj.intValue();
		}
		boolean isTenkenEmpty = record.isEmptyRecord();
		boolean isMessageEmpty = true;
//		long utime;
		for (int i = 0; i < messageData.size(); i++) {
			String[] message = messageData.get(i);
//			if (message.length <= timeCol) {
//				continue;
//			}
//			try {
//				utime = new Long(message[timeCol]).longValue();
//			} catch (NumberFormatException e) {
//				continue;
//			}
			// specify tenken record to be joined with message data
			// temporarily disabled
			int col = 0;
			//int col = joinTarget(utime, (ArrayList<Long>)tenkenData[2], (Map<Long, Integer>)tenkenData[3]);
//			if (-1 == col || tenkenBody.size() <= col) {
//				continue;
//			}
			int msgCount = msgCounts.get(col).intValue();
			if (messageMax <= msgCount) {
				continue;
			}
			for(int j = 0; j < msgColCount; j++) {
				ArrayList<String> tenken = tenkenBody.get(col);
				int pos = colList.get(j).intValue();
				if (-1 == pos) {
					tenken.add("");
				}
				if (pos >= message.length) {
					Util.processInvalidSetting("messageevent", i, message);
					tenken.add("");
				}
				String value = message[pos];
				if (null == value || 0 == value.length()) {
					tenken.add("");
				} else {
					tenken.add(value);
					isMessageEmpty = false;
				}
			}
			msgCount++;
			msgCounts.set(col, new Integer(msgCount));
		}
		for (int i = 0; i < tenkenBody.size(); i++) {
			ArrayList<String> tenken = tenkenBody.get(i);
			int msgCount = msgCounts.get(i).intValue();
			for (int j = msgCount*msgColCount; j < messageMax*msgColCount; j++) {
				tenken.add("");
			}
		}

		if (isDebug) {
			System.out.println(header);
			System.out.println(tenkenBody);
		}

		int timeColCsv = record.getTimeColCsv();
		timeColsSet.add(new Integer(timeColCsv));

		this.header = header;
		if (isTenkenEmpty && isMessageEmpty) {
			// both tenken record and message event are empty, therefore has empty tenken result
			this.body = new ArrayList<ArrayList<String>>();
		} else {
		this.body = tenkenBody;
		}
	}

	private ArrayList<String[]> readMap (String dir) {
		ArrayList<String[]> msgMapDefault = new ArrayList<String[]>();
		for (int i = 0; i < msgItemDefault.length; i++) {
			msgMapDefault.add(msgItemDefault[i]);
		}

	String msgMapPath = dir + File.separator + "messagedatamap.csv";
		File msgMapFile = new File(msgMapPath);
		if (!msgMapFile.canRead() || !msgMapFile.isFile()) {
			// no map file, use default data
			return msgMapDefault;
		}

		ArrayList<String[]> msgMap = CSVReader.readCsvFile(msgMapPath);
		if (msgMap.size() == 0) {
			// empty map file, use default data
//			System.out.println(MSG_MESSAGE_MAP_EMPTY);
			return msgMapDefault;
		}

		Util.checkMapFile(msgMap, msgMapPath, keyCount, false);
		return msgMap;
	}

	private ArrayList<String> mergeHeader(ArrayList<String> header) {
		int orgSize = header.size();
		int mapSize = dataMap.size()-1;
		int timeRow = -1;
		ArrayList<String> labels = new ArrayList<String>();
		for (int i = 1; i <= mapSize; i++) {
			String label = "";
			String[] line = dataMap.get(i);
			if (keyCount+1 < line.length) {
				label = line[keyCount+1];
			} else {
				continue;
			}
			labels.add(label);

			if (keyCount < line.length && messagetime.equals(line[keyCount])) {
				timeRow = i-1;
			}
		}

		for (int i = 1; i < messageMax+1; i++) {
			for (int j = 0; j < labels.size(); j++) {
				char[] num = (new Integer(i)).toString().toCharArray();
				StringBuilder sb = new StringBuilder(messageLabel);
				for (int k = 0; k < num.length; k++) {
					char zenkakuNum = Util.han2zen(num[k]);
					sb.append(zenkakuNum);
				}
				sb.append("－");
				sb.append(labels.get(j));
				header.add(sb.toString());
			}

			if (timeRow != -1) {
				int col = timeRow + mapSize*(i-1) + orgSize + msgOffset;
//				timeRowsCsv.put(new Integer(row), new Integer(i-1));
				timeColsSet.add(new Integer(col));
			}
		}

		return header;
	}

	private int joinTarget(long msgTime, ArrayList<Long> timeList, Map<Long, Integer> timeMap) {
		int result = -1;
		long tTime = 0;
		for (int i = 0; i < timeList.size(); i++) {
			Long obj = timeList.get(i);
			if (null == obj) {
				continue;
			}

			long time = obj.longValue();
			if (msgTime == time) {
				tTime = msgTime;
				break;
			}
			if (time < msgTime && tTime < time) {
				tTime = time;
			}
		}

		Long timeKey = new Long(tTime);
		Integer row = timeMap.get(timeKey);
		if (row != null) {
			result = row.intValue();
		}

		return result;
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
	public Map<Integer, Long> getRowTimeMap() {
		return rowTimeMap;
	}
	public int getTimeCol() {
		return timeCol;
	}
	/**
	 * 
	 * @return 点検と申し送りのエポック時刻（ミリ秒単位）を表す列番号（0からスタート）
	 */
	public Set<Integer> getTimeColsCsv() {
		return timeColsSet;
	}
	/* add operator output start */
	public ArrayList<String> getOpeHeader() {
		return opeHeader;
	}
	public ArrayList<ArrayList<String>> getAllOpes() {
		return allOpes;
	}
	/* add operator output end */
}
