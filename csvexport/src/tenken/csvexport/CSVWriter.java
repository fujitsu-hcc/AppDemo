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

import java.io.BufferedWriter;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.util.ArrayList;
import java.util.Set;

/**
 * 2次元配列のStringデータをCSVファイルに出力するクラス（文字コードはUTF-8）
 */
public class CSVWriter {

	private static final String NEWLINE = System.getProperty("line.separator");

	/**
	 * CSVファイルにヘッダを出力する
	 * @param outputPath 出力先の絶対パス
	 * @param header ヘッダのデータ
	 */
	public static void writeHeader(String outputPath, ArrayList<String> header) {
		FileOutputStream fos = null;
		OutputStreamWriter osw = null;
		BufferedWriter bw = null;
		try {
			fos = new FileOutputStream(outputPath);
			osw = new OutputStreamWriter(fos, "UTF-8");
			bw = new BufferedWriter(osw);

			// output item label
			for (int i = 0; i < header.size(); i++) {
				String value = header.get(i);
				if (null != value && !"".equals(value)) {
					bw.write("\"");
					bw.write(value);
					bw.write("\"");
				}
				if (i < header.size()-1) {
					bw.write(",");
				}
			}
			bw.write(NEWLINE);
//			System.out.println("output CSV header");
		} catch (IOException e) {
			// TODO
			e.printStackTrace();
		} finally {
			try {
				if (bw != null) {
					bw.close();
				}
				if (osw != null) {
					osw.close();
				}
				if (fos != null) {
					fos.close();
				}
			} catch (IOException e) {
				// NOP
			}
		}
	}

	/**
	 * CSVファイルにデータ本体を出力する
	 * @param outputPath 出力先の絶対パス
	 * @param body 本体のデータ
	 * @param timeColsCsv 出力時に日時形式への変換対象とする列番号（複数指定、0からスタート）
	 * この引数で指定された列のデータは、long型数値として扱える場合、ミリ秒単位のエポック時刻とみなされ
	 * yyyy/MM/dd HH:mm:ss形式に変換されて出力される
	 */
	public static void writeBody(
		String outputPath, ArrayList<ArrayList<String>> body, Set<Integer> timeColsCsv) {
		FileOutputStream fos = null;
		OutputStreamWriter osw = null;
		BufferedWriter bw = null;
		try {
			fos = new FileOutputStream(outputPath, true);
			osw = new OutputStreamWriter(fos, "UTF-8");
			bw = new BufferedWriter(osw);

			// output data
			for (int i = 0; i < body.size(); i++) {
				ArrayList<String> recordStr = body.get(i);
				for (int j = 0; j < recordStr.size(); j++) {
					String value = null;
					if (timeColsCsv.contains(new Integer(j))) {
						String valStr = recordStr.get(j);
						if (valStr != null && !valStr.isEmpty()) {
							try {
								long utime = (new Long(recordStr.get(j))).longValue();
								value = Util.formatDate(utime);
							} catch (NumberFormatException nfe) {
								value = valStr;
							}
						} else {
							value = valStr;
						}
					} else {
						value = recordStr.get(j);
					}
					if (null != value && !"".equals(value)) {
						bw.write("\"");
						bw.write(value);
						bw.write("\"");
					}
					if (j < recordStr.size()-1) {
						bw.write(",");
					}
				}
				bw.write(NEWLINE);
			}
//			System.out.println("output CSV data");
//			System.out.println("Please check the file " + outputPath);

		} catch (IOException e) {
			// TODO
			e.printStackTrace();
		} finally {
			try {
				if (bw != null) {
					bw.close();
				}
				if (osw != null) {
					osw.close();
				}
				if (fos != null) {
					fos.close();
				}
			} catch (IOException e) {
				// NOP
			}
		}
	}
}
