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
import java.io.IOException;
import java.text.DateFormat;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.StringTokenizer;

/**
 * 点検結果テーブルから取得した点検結果と申し送りテーブルから取得した申し送りをマージし、
 * <br />1回の点検を1レコードとしたものを出力するクラス
 */
public class LoadTenkenDataMulti {

	private static Map<Integer, Integer> timeColsCsv = new HashMap<Integer, Integer>();

	private static boolean useSsl = false;
	private static boolean keepMap = false;
	/* add operator output start */
	private static boolean outputOpe = false;
	/* add operator output end */
	private static boolean useGivenMap = false;

	private static String outputDir = null;

	private static int keyCount = 2;

	private static final String NEWLINE = System.getProperty("line.separator");

	// TODO move to message resource file
	private static final String MSG_ERROR_CSV_OUTPUT_ABORTED = "CSV output process is aborted.";
	private static final String MSG_ERROR_INVALID_PARAMETER_SPECIFIED = "invalid parameter or option value was specified.";
	private static final String MSG_ERROR_DIR_NOT_SPECIFIED = "output directory is not specified";
	private static final String MSG_ERROR_NOT_DIRECTORY = "specified output path is not directory";
	private static final String MSG_ERROR_DIR_INVALID = "specified output path is invalid";
	private static final String MSG_TENKEN_ITEM_FILE_INVALID = "specified tenken item file is invalid. output tenken items defined in tenkentable ";
	private static final String MSG_ERROR_EMPTY_TENKEN_MAP_FILE = "empty tenken map file";
	private static final String MSG_ERROR_CANNOT_READ_TENKEN_MAP = "cannot read tenken map file";
	private static final String MSG_CANNOT_READ_TENKEN_ITEM_FILE = "cannot read specified tenken item file, output tenken data using tenkentable data";
	private static final String OUTPUT_CSV_DATA = "output CSV data";
	private static final String PLEASE_CHECK_THE_FILE = "Please check the file ";
	private static final String MSG_ILLEGAL_DATE_TIME_FORMAT = "Illegal date / time format specified. output empty for the item.";
	private static final String MSG_MESSAGE_MAP_EMPTY = "message event map file is empty. output CSV file with default message event item";

	/**
	 * @param args
	 */
	public static void main(String[] args) {
		if (args.length < 4) {
			System.out.println(
				"usage: loadtenkendata {server address} {port} {output path} {start date} [{end date} [{tenken item file} {date output file} [options]]]");
			System.exit(1);
		}

		// additional parameters/options
		Map<String, String> options = new HashMap<String, String>();
		Set<String> argSet = new HashSet<String>();

		Set<Integer> scids = new HashSet<Integer>();
		scids.add(new Integer(0));
		for (int i = 5; i < args.length; i++) {
			String arg = args[i].toLowerCase();
			argSet.add(arg);
			/* check scenario id start */
//			if (arg.startsWith("scenarioid") && arg.length() >= 11) {
//				String scenStr = arg.substring(11);
			if (arg.startsWith("scenarioid")) {
				String[] split = arg.split("=", 2);
				if (split.length < 2) {
					// stop process
					invalidParam("scenario id", arg);
				}
				String scenStr = split[1];
				int idTemp;
				try {
					idTemp = (new Integer(scenStr)).intValue();
					// Scenario ID must be between 1 and 9999 (Interstage AR specification)
					if (1 <= idTemp && idTemp <= 9999) {
						options.put("scenarioId", scenStr);
					}
					else {
						// stop process
						invalidParam("scenario id", scenStr);
					}
				} catch (NumberFormatException e) {
					// stop process
					invalidParam("scenario id", scenStr);
				}
				// TODO multi scenario id specified
//				StringTokenizer st = new StringTokenizer(idstr, ",");
//				if (st.countTokens() == 1) {
//					options.put("scenarioId", idstr);
//				} else {
//					while (st.hasMoreTokens()) {
//						int id = 0;
//						String token = st.nextToken();
//						try {
//							id = (new Integer(token)).intValue();
//						} catch (NumberFormatException nfe) {
//							// nop
//						}
//						if (1 <= id && id <= 9999) {
//							scids.add(new Integer(id));
//						}
//					}
//				}
			}
			/* check scenario id end */
		}
		// secret option handling
		if (argSet.contains("ssl")) {
			useSsl = true;
			options.put("useSsl", "true");
		}
		if (argSet.contains("debug")) {
			options.put("debug", "true");
		}
		if (argSet.contains("all")) {
			options.put("outputAll", "true");
		}
		if (argSet.contains("notnull")) {
			options.put("notNull", "true");
		}
		if (argSet.contains("keepmap")) {
			keepMap = true;
		}
		int period = Calendar.DATE;
		if (argSet.contains("weekly")) {
			period = Calendar.WEEK_OF_YEAR;
			options.put("period", "week");
		} else if (argSet.contains("monthly")) {
			period = Calendar.MONTH;
			options.put("period", "month");
		}
		/* add operator output start */
		if (argSet.contains("operator")) {
			options.put("operator", "true");
			outputOpe = true;
		}
		/* add operator output end */
		/* use given map (original format) */
		if (argSet.contains("usegivenmap")) {
			useGivenMap = true;
		}
		/* use given map (original format) end */
		/* add operator output start */
		if (argSet.contains("lastvalueunitrow")) {
			options.put("lastvalueunit", "row");
		}

		String prctl = null;
		if (useSsl) {
			prctl = "https";
		} else {
			prctl = "http";
		}
		String urlBase = prctl + "://" + args[0] + ":" + args[1];
		if (null == args[2] || "".equals(args[2])) {
			// TODO output error information
			System.out.println(MSG_ERROR_DIR_NOT_SPECIFIED);
			System.exit(1);
		}
		File dir = new File(args[2]);
		if (!dir.isDirectory()) {
			System.out.println(MSG_ERROR_NOT_DIRECTORY);
			System.exit(1);
		}
		//String outputDir = args[2];
		try {
			outputDir = dir.getCanonicalPath();
		} catch (IOException e) {
			System.out.println(MSG_ERROR_DIR_INVALID);
			System.exit(1);
		}

		String dateStr = null;
		Date startDate = null;
//		if (args.length == 3) {
//			dateStr = null;
//		}
		if (args.length >= 4) {
			dateStr = args[3];
			DateFormat df = new SimpleDateFormat("yyyyMMdd");
			try {
				startDate = df.parse(dateStr);
			} catch (ParseException e1) {
				// stop process
				invalidParam("start date", dateStr);
			}
		}

		Date endDate = null;
		if (args.length < 5) {
			endDate = startDate;
		} else {
			dateStr = args[4];
			DateFormat df = new SimpleDateFormat("yyyyMMdd");
			try {
				endDate = df.parse(dateStr);
			} catch (ParseException e1) {
				// stop process
				invalidParam("end date", dateStr);
			}
		}

		String outputPath = null;
		if (null == startDate) {
			outputPath = outputDir + File.separator + "tenkendata" + ".csv";
		} else if (endDate == null || endDate.equals(startDate)) {
			outputPath = outputDir + File.separator + "tenkendata" +"_" + args[3] + ".csv";
		} else {
			outputPath = outputDir + File.separator + "tenkendata" +"_" + args[3] +"_" + args[4] + ".csv";
		}

		File inMap = null;
		if (args.length >= 6 && !useGivenMap) {
			inMap = new File(args[5]);
			if (!inMap.canRead() || !inMap.isFile()) {
				System.out.println(MSG_CANNOT_READ_TENKEN_ITEM_FILE);
				inMap = null;
			}
		}

		int dataCount = 0;
		String dataMapPath = outputDir + File.separator + "tenkendatamap.csv";
		File dataMap = new File(dataMapPath);
		if (useGivenMap) {
			if (!dataMap.canRead() || !dataMap.isFile()) {
				// could not read map file
				errorEnd(MSG_ERROR_CANNOT_READ_TENKEN_MAP);
			}

			ArrayList<String[]> map = CSVReader.readCsvFile(dataMapPath);
			if (map.size() <= 1) {
				// empty map file
				errorEnd(MSG_ERROR_EMPTY_TENKEN_MAP_FILE);
			}
			// check specified tenken data map
			boolean isValidMap = Util.checkMapFile(map, dataMapPath, keyCount, true);
			if (!isValidMap) {
				// empty map file
				errorEnd(MSG_ERROR_EMPTY_TENKEN_MAP_FILE);
			}
			dataCount = map.size()-1;
		} else {
			/* generate tenken data map file using specified tenken item file and tenkentable start */
			TenkenDataMap newMap = null;
			boolean isValidFile = true;
			if (inMap != null) {
				newMap = new TenkenDataMap(urlBase, args[5], options);
				isValidFile = newMap.isValidFile();
				if (!isValidFile) {
					System.out.println(MSG_TENKEN_ITEM_FILE_INVALID);
				}
			}
			if (inMap == null || !isValidFile) {
				// tenken item file is not specified or invalid
				// generate data map using only tenkentable
				TenkenTable table = new TenkenTable(urlBase, options);
				ArrayList<String> tableHeader = table.getHeader();
				ArrayList<ArrayList<String>> tableBody = table.getMap();
				CSVWriter.writeHeader(dataMapPath, tableHeader);
				Set<Integer> columns = new HashSet<Integer>();
				CSVWriter.writeBody(dataMapPath, tableBody, columns);
				dataCount = tableBody.size();
			} else {
				// generate data map using specified tenken item file
				// TenkenDataMap newMap = new TenkenDataMap(urlBase, args[5], options);
				ArrayList<String> tableHeader = newMap.getHeader();
				ArrayList<ArrayList<String>> tableBody = newMap.getMap();
				CSVWriter.writeHeader(dataMapPath, tableHeader);
				Set<Integer> columns = new HashSet<Integer>();
				CSVWriter.writeBody(dataMapPath, tableBody, columns);
				dataCount = tableBody.size();
			}
			/* generate tenken data map file using specified map file and tenkentable end */
		}

		/* set date/time output option start */
		CalendarOption calOpt = null;
		int msgOffset = 0;
		if (args.length >= 7) {
			calOpt = new CalendarOption(args[6]);
			if (calOpt.outputDay()) {
				msgOffset++;
			}
			if (calOpt.outputTime()) {
				msgOffset++;
			}
			if (calOpt.outputDate()) {
				msgOffset++;
			}
			if (calOpt.outputCal()) {
				msgOffset++;
			}
		}
		/* set date/time output option end */
		/* add operator output start */
		if (outputOpe) {
			String baseDataMapPath = args[2] + File.separator + "basedatamap.csv";
			File baseDataMap = new File(baseDataMapPath);
			if (baseDataMap.canRead()) {
				ArrayList<String[]> map = CSVReader.readCsvFile(dataMapPath);
				if (map.size() <= 1) {
					// invalid base data map
					msgOffset++;
				} else {
					boolean isValidMap = Util.checkMapFile(map, baseDataMapPath, keyCount, true);
					if (isValidMap) {
						// this base data map is valid
						msgOffset += map.size()-1;
					} else {
						// this base data map is invalid
						msgOffset++;
					}
				}
			} else {
				// not use base data map
				msgOffset++;
			}
		}
		/* add operator output end */
		options.put("msgOffset", (new Integer(msgOffset)).toString());

		/* check message map file start */
		String msgMapPath = dir + File.separator + "messagedatamap.csv";
		File msgMapFile = new File(msgMapPath);
		if (msgMapFile.canRead() && msgMapFile.isFile()) {
		ArrayList<String[]> msgMap = CSVReader.readCsvFile(msgMapPath);
			if (msgMap.size() == 0) {
				// empty map file, use default data
				System.out.println(MSG_MESSAGE_MAP_EMPTY);
			}
		}
		/* check message map file end */

		Calendar cal = Calendar.getInstance();
		long utime = 0, end = 0;
		if (null == startDate) {
			// hidden
//			cal.set(Calendar.HOUR_OF_DAY, 0);
//			cal.set(Calendar.MINUTE, 0);
//			cal.set(Calendar.SECOND, 0);
//			cal.set(Calendar.MILLISECOND, 0);
			// cannot reach here
			// stop process
			invalidParam("start date", dateStr);
		} else {
			cal.setTime(startDate);
		}
		utime = cal.getTimeInMillis();
		Calendar endCal = Calendar.getInstance();
		if (null != endDate) {
			endCal.setTime(endDate);
		}
		end = endCal.getTimeInMillis();

		if (utime > end) {
			// stop process
			invalidParam("start date / end date", args[3] + " / " + args[4]);
		}

		for (int i = 0; utime <= end; i++) {
			Date date = cal.getTime();
			TenkenEventMessage record = new TenkenEventMessage(urlBase, outputDir, date, options);
			ArrayList<ArrayList<String>> body = record.getBody();
			Set<Integer> timeColsCsv = record.getTimeColsCsv();

			if (0 == i) {
				ArrayList<String> header = record.getHeader();
				if (calOpt != null) {
					if (calOpt.outputDay()) {
						header.add(dataCount, calOpt.getDayTitle());
					}
					if (calOpt.outputTime()) {
						header.add(dataCount, calOpt.getTimeTitle());
					}
					if (calOpt.outputDate()) {
						header.add(dataCount, calOpt.getDateTitle());
					}
					if (calOpt.outputCal()) {
						header.add(dataCount, calOpt.getCalTitle());
					}
				}
				/* add operator output start */
				if (outputOpe) {
					ArrayList<String> opeHeader = record.getOpeHeader();
					for (int j = opeHeader.size()-1; j >= 0; j--) {
						header.add(dataCount, opeHeader.get(j));
					}
				}
				/* add operator output end */
				CSVWriter.writeHeader(outputPath, header);
			}

			if (calOpt != null) {
				Map<Integer, Long> colTimeMap = record.getRowTimeMap();
				for (int j = 0; j < body.size(); j++) {
					ArrayList<String> line = body.get(j);
					Calendar c = Calendar.getInstance();
					Long l = colTimeMap.get(new Integer(j));
					if (null == l) {
						continue;
					}
					c.setTimeInMillis(l.longValue());
					Date d = c.getTime();
					if (calOpt != null) {
						if (calOpt.outputDay()) {
							try {
								DateFormat df = new SimpleDateFormat(calOpt.getDayFormat());
								line.add(dataCount, df.format(d));
							} catch (IllegalArgumentException e) {
								System.out.println(MSG_ILLEGAL_DATE_TIME_FORMAT);
								line.add(dataCount, "");
							}
						}
						if (calOpt.outputTime()) {
							try {
								DateFormat df = new SimpleDateFormat(calOpt.getTimeFormat());
								line.add(dataCount, df.format(d));
							} catch (IllegalArgumentException e) {
								System.out.println(MSG_ILLEGAL_DATE_TIME_FORMAT);
								line.add(dataCount, "");
							}
						}
						if (calOpt.outputDate()) {
							try {
								DateFormat df = new SimpleDateFormat(calOpt.getDateFormat());
								line.add(dataCount, df.format(d));
							} catch (IllegalArgumentException e) {
								System.out.println(MSG_ILLEGAL_DATE_TIME_FORMAT);
								line.add(dataCount, "");
							}
						}
						if (calOpt.outputCal()) {
							try {
								DateFormat df = new SimpleDateFormat(calOpt.getCalFormat());
								line.add(dataCount, df.format(d));
							} catch (IllegalArgumentException e) {
								System.out.println(MSG_ILLEGAL_DATE_TIME_FORMAT);
								line.add(dataCount, "");
							}
						}
					}
				}
			}
			/* add operator output start */
			if (outputOpe) {
				for (int j = 0; j < body.size(); j++) {
					ArrayList<String> line = body.get(j);
					ArrayList<String> opes = record.getAllOpes().get(j);
					for (int k = opes.size()-1; k >= 0; k--) {
						line.add(dataCount, opes.get(k));
					}
				}
			}
			/* add operator output end */

			CSVWriter.writeBody(outputPath, body, timeColsCsv);

			cal.add(period, 1);
			utime = cal.getTimeInMillis();
		}

		System.out.println(OUTPUT_CSV_DATA);
		System.out.println(PLEASE_CHECK_THE_FILE + outputPath);

		if (!useGivenMap && !keepMap) {
			dataMap.delete();
		}
	}

	private static void invalidParam (String kind, String val) {
		String msg = MSG_ERROR_INVALID_PARAMETER_SPECIFIED
			+" parameter (option) = " + kind + ", specified value = " + val;
		errorEnd(msg);
	}

	private static void errorEnd (String msg) {
		System.out.println(msg);
		System.out.println(MSG_ERROR_CSV_OUTPUT_ABORTED);
		if (!useGivenMap && !keepMap) {
			String dataMapPath = outputDir + File.separator + "tenkendatamap.csv";
			File dataMap = new File(dataMapPath);
			dataMap.delete();
		}
		System.exit(1);
	}
}
