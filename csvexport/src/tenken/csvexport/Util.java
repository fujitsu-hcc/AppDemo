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

import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;

public class Util {
	// prohibited letters of List Creator CSV item name (multi byte letters)
	private static final String prohibited
	= "[！”＃＄％＆’（）＝～＾｜￥「」｛｝；：＋＊＜＞？＿、。]";

	// TODO move to message resource file
	private static final String CSV_OUTPUT_ABORTED = "CSV output process is aborted.";
	/**
	 * エポック時刻（ミリ秒単位）をyyyy/MM/dd HH:mm:ss形式で日時文字列表示に変換
	 * @param utime エポック時刻（ミリ秒単位）
	 * @return 日時の文字列
	 */
	public static String formatDate(long utime) {
		return formatDate(utime, "yyyy/MM/dd HH:mm:ss");
	}
	/**
	 * エポック時刻（ミリ秒単位）を指定された形式で日時文字列表示に変換
	 * @param utime エポック時刻（ミリ秒単位）
	 * @param format 日時表示のフォーマット指定。SimpleDateFormatクラスの仕様に従う
	 * @return 日時の文字列
	 */
	public static String formatDate(long utime, String format) {
		Date date = new Date(utime);
		DateFormat df = new SimpleDateFormat(format);
		return df.format(date);
	}

	/**
	 * 半角文字を全角文字に変換（現時点では数字のみ）
	 * @param c 半角数字
	 * @return 対応する全角数字
	 */
	public static char han2zen (char c) {
		switch (c) {
		case '0':
			return '０';
		case '1':
			return '１';
		case '2':
			return '２';
		case '3':
			return '３';
		case '4':
			return '４';
		case '5':
			return '５';
		case '6':
			return '６';
		case '7':
			return '７';
		case '8':
			return '８';
		case '9':
			return '９';
		default:
			return c;
		}
	}

	public static void processInvalidSetting (String path, int line, String[] record) {
		processInvalidSetting (path, line, record, false);
	}

	public static void processInvalidSetting (String path, int line, String[] record, boolean abort) {
//		StringBuilder sb = new StringBuilder("");
//		for (int i = 0; i < record.length; i++) {
//			sb.append(record[i]);
//			if (i < record.length-1) {
//				sb.append(",");
//			}
//		}
//		String recStr = sb.toString();
		String msg = "invalid record was found in: "
			+ path
			+ ", line = "
			+ line
//			+ ", record = "
//			+ recStr
			;
		System.out.println(msg);
		if (abort) {
			System.out.println(CSV_OUTPUT_ABORTED);
			System.exit(1);
		}
	}


	public static boolean checkMapFile (ArrayList<String[]> map, String mapPath, int keyCount, boolean outputMsg) {
		boolean isValid = false;

		for (int i = map.size()-1; i >= 0 ; i--) {
			String[] mapRecord = map.get(i);
			if (mapRecord.length != keyCount+2) {
				// this line is invalid
				if (outputMsg) {
					Util.processInvalidSetting(mapPath, i, mapRecord);
				}
				map.remove(i);
				continue;
			}
			boolean isValidLine = true;
			for (int j = 0; j < keyCount+2; j++) {
				String s = mapRecord[j];
				if (s == null || s.length() == 0) {
					// this line is invalid
					if (outputMsg) {
						Util.processInvalidSetting(mapPath, i, mapRecord);
					}
					isValidLine = false;
					break;
				}
			}
			if (!isValidLine) {
				map.remove(i);
				continue;
			}
		}
		// at least there is header + 1 record for valid map
		if (map.size() >= 2) {
			isValid = true;
		}

		return isValid;
	}

}
