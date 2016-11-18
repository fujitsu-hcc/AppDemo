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
import java.io.BufferedReader;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * UTF-8のCSVファイルを読み込み、Stringが2次元に並んだデータとして格納するクラス
 */
public class CSVReader {

	/**
	 * UTF-8のCSVファイルを読み込む
	 * @param path 読み込むファイルの絶対パス
	 * @return Stringで2次元に並んだデータ
	 */
	public static ArrayList<String[]> readCsvFile (String path) {
		ArrayList<String[]> map = new ArrayList<String[]>();
		FileInputStream fis = null;
		InputStreamReader isr = null;
		BufferedReader br = null;
		try {
			fis = new FileInputStream(path);
			isr = new InputStreamReader(fis, "UTF-8");
			br = new BufferedReader(isr);
			boolean is1stLine = true;
			while (true) {
				String line = br.readLine();
				if (null == line) {
					break;
				}
				// skip UTF-8 BOM (0xEF BB BF) start
				if (is1stLine) {
					byte[] buf = line.getBytes("UTF-8");
					if (3 <= buf.length) {
						int[] bf = new int[3];
						bf[0] = buf[0] & 0xff;
						bf[1] = buf[1] & 0xff;
						bf[2] = buf[2] & 0xff;
						if ( bf[0] == 0xef && bf[1] == 0xbb && bf[2] == 0xbf ) {
							line = new String(buf, 3, buf.length-3, "UTF-8");
						}
					}
				}
				// skip UTF-8 BOM (0xEF BB BF) end
				is1stLine = false;
				if (line.length() == 0) {
					continue;
				} else if (line.startsWith("#")) {
					continue;
				} else {
					ArrayList<String> recArray = new Record(line);
					final int count = recArray.size();
					String[] record = new String[count];
					for (int i = 0; i < count; i++) {
						String org = recArray.get(i);
						if (org.startsWith("\"") && org.endsWith("\"")) {
							int len = org.length();
							record[i] = org.substring(1, len-1);
						} else {
						record[i] = recArray.get(i);
						}
					}
					map.add(record);
				}
			}
		} catch (IOException e) {
			e.printStackTrace();
		} finally {
			try {
				if (br != null) {
					br.close();
				}
				if (isr != null) {
					isr.close();
				}
				if (fis != null) {
					fis.close();
				}
			} catch (IOException e) {
				// TODO 自動生成された catch ブロック
				// nop
			}
		}
		return map;
	}
	
	/**
	 * CSVファイルの1レコードを解析するためのクラスです。
	 */
	public static class Record extends ArrayList<String> {
		private static final long serialVersionUID = 3909411585829506773L;
		private static final int INIT = 0, NOT_DQ = 1, DQ = 2, ESC_DQ = 3;
		private static final char QUOTE = '"';
		private static final char SEPARATOR = ',';
		private static final Pattern patEuc = Pattern.compile("^euc.?jp.*", Pattern.CASE_INSENSITIVE);
		private static final Pattern patSjis = Pattern.compile("^pck|sjis|shift.?jis.*", Pattern.CASE_INSENSITIVE);
		private static final Matcher mEuc = patEuc.matcher(System.getProperty("file.encoding"));
		private static final Matcher mSjis = patSjis.matcher(System.getProperty("file.encoding"));
		private static String code = "";
		static {
			if (mEuc.matches()) {
				code = "EUC";
			} else if (mSjis.matches()) {
				code = "SJIS";
			} else {
			}
		}

		public Record(final String record) {
			parse(record);
		}
		public void parse(final String line) {
			clear();
			StringBuffer sb = new StringBuffer();
			int state = INIT;
			int i = 0;
			char c = 0;
			for (i = 0; i < line.length(); i++) {
				c = line.charAt(i);
				c = convert(c);
				switch (state) {
				case INIT:
					if (c == SEPARATOR) {
						add("");
					} else if (c == QUOTE) {
						state = DQ;
					} else {
						state = NOT_DQ;
						sb.append(c);
					}
					break;
				case NOT_DQ:
					if (c == SEPARATOR) {
						add(sb.toString());
						sb.setLength(0);
						state = INIT;
					} else {
						sb.append(c);
					}
					break;
				case DQ:
					if (c == QUOTE) {
						if ((i + 1) == line.length()) {
							state = NOT_DQ;
						} else {
							if (line.charAt(i + 1) == QUOTE) {
								state = ESC_DQ;
							} else if (line.charAt(i + 1) == SEPARATOR) {
								state = NOT_DQ;
							} else {
								sb.append(c);
							}
						}
					} else {
						sb.append(c);
					}
					break;
				case ESC_DQ:
					if (c == QUOTE) {
						sb.append(c);
						state = DQ;
					}
					break;
				}
			}
			add(sb.toString());
		}
		public String toString() {
			StringBuffer sb = new StringBuffer();
			for (int i = 0; i < size(); i++) {
				if (i != 0) {
					sb.append(SEPARATOR);
				}
				sb.append(QUOTE + quote(get(i)) + QUOTE);
			}
			return sb.toString();
		}
		private String quote(final String field) {
			if (field == null || field.length() == 0) {
				return "";
			}
			StringBuffer sb = new StringBuffer();
			for (int i = 0; i < field.length(); i++) {
				if (field.charAt(i) == QUOTE) {
					sb.append(QUOTE);
				}
				sb.append(field.charAt(i));
			}
			return sb.toString();
		}
		private static char convert(final char c) {
			char converted = c;
			if (code.equals("EUC") || code.equals("SJIS")) {
				switch (c) {
				case 0x301c:
					converted = 0xff5e; // WAVE DASH
					break;
				case 0x2016:
					converted = 0x2225; // DOUBLE VERTICAL LINE
					break;
				case 0x2212:
					converted = 0xff0d; // MINUS SIGN
					break;
				case 0x00a2:
					converted = 0xffe0; // CENT SIGN
					break;
				case 0x00a3:
					converted = 0xffe1; // POUND SIGN
					break;
				case 0x00ac:
					converted = 0xffe2; // NOT SIGN
					break;
				case 0x2014:
					converted = 0x2015; // FULLWIDTH DASH
					break;
				}
			}
			return converted;
		}
	}
}
