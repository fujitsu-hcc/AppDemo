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
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStreamReader;

/**
 * 日時出力設定ファイルで指定された出力有無・出力形式・CSVヘッダを保持するクラス
 * <br />出力形式の指定はSimpleDateFormatクラスの仕様に従う
 */
public class CalendarOption {
	private String path;

	private boolean outputCal = false;
	private String calFormat = "yyyy/MM/dd HH:mm:ss";
	private String calTitle = "点検日時";
	private boolean outputDate = false;
	private String dateFormat = "yyyy/MM/dd";
	private String dateTitle = "点検日";
	private boolean outputTime = false;
	private String timeFormat = "HH:mm:ss";
	private String timeTitle = "点検時刻";
	private boolean outputDay = false;
	private String dayFormat = "EEEE";
	private String dayTitle = "曜日";

	public CalendarOption(String path) {
		this.path = path;
		read();
	}

	private void read() {
		File file = new File(path);
		if (!file.canRead() || !file.isFile()) {
			String msg = "cannot read specified date/time output file,\n"
					+ "output tenken data without additional tenken date/time item";
			System.out.println(msg);
			return;
		}

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
				if (line.startsWith(";")) {
					continue;
				} else {
					String[] split = line.split("=", 2);
					if (0 == split.length) {
						continue;
					}
					if ("calendarFormat".equalsIgnoreCase(split[0])) {
						if (1 < split.length && !"".equals(split[1])) {
							outputCal = true;
							calFormat = split[1];
						}
						continue;
					}
					if ("calendarName".equalsIgnoreCase(split[0])) {
						if (1 < split.length && !"".equals(split[1])) {
							calTitle = split[1];
						}
						continue;
					}
					if ("dateFormat".equalsIgnoreCase(split[0])) {
						if (1 < split.length && !"".equals(split[1])) {
							outputDate = true;
							dateFormat = split[1];
						}
						continue;
					}
					if ("dateName".equalsIgnoreCase(split[0])) {
						if (1 < split.length && !"".equals(split[1])) {
							dateTitle = split[1];
						}
						continue;
					}
					if ("timeFormat".equalsIgnoreCase(split[0])) {
						if (1 < split.length && !"".equals(split[1])) {
							outputTime = true;
							timeFormat = split[1];
						}
						continue;
					}
					if ("timeName".equalsIgnoreCase(split[0])) {
						if (1 < split.length && !"".equals(split[1])) {
							timeTitle = split[1];
						}
						continue;
					}
					if ("dayFormat".equalsIgnoreCase(split[0])) {
						if (1 < split.length && !"".equals(split[1])) {
							outputDay = true;
							dayFormat = split[1];
						}
						continue;
					}
					if ("dayName".equalsIgnoreCase(split[0])) {
						if (1 < split.length && !"".equals(split[1])) {
							dayTitle = split[1];
						}
						continue;
					}
				}
			}
		} catch (IOException e) {
			return;
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
				// NOP
			}
		}

	}

	/**
	 * 
	 * @return 日時項目の出力有無
	 */
	public boolean outputCal() {
		return outputCal;
	}

	/**
	 * 
	 * @return 日時項目の出力形式
	 */
	public String getCalFormat() {
		return calFormat;
	}

	/**
	 * 
	 * @return 日時項目のCSVヘッダ
	 */
	public String getCalTitle() {
		return calTitle;
	}

	/**
	 * 
	 * @return 日付項目の出力有無
	 */
	public boolean outputDate() {
		return outputDate;
	}

	/**
	 * 
	 * @return 日付項目の出力形式
	 */
	public String getDateFormat() {
		return dateFormat;
	}

	/**
	 * 
	 * @return 日付項目のCSVヘッダ
	 */
	public String getDateTitle() {
		return dateTitle;
	}

	/**
	 * 
	 * @return 時刻項目の出力有無
	 */
	public boolean outputTime() {
		return outputTime;
	}

	/**
	 * 
	 * @return 時刻項目の出力形式
	 */
	public String getTimeFormat() {
		return timeFormat;
	}

	/**
	 * 
	 * @return 時刻項目のCSVヘッダ
	 */
	public String getTimeTitle() {
		return timeTitle;
	}

	/**
	 * 
	 * @return 曜日項目の出力有無
	 */
	public boolean outputDay() {
		return outputDay;
	}

	/**
	 * 
	 * @return 曜日項目の出力形式
	 */
	public String getDayFormat() {
		return dayFormat;
	}

	/**
	 * 
	 * @return 曜日項目のCSVヘッダ
	 */
	public String getDayTitle() {
		return dayTitle;
	}

}
