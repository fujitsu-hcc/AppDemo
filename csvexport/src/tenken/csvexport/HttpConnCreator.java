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
import java.io.*;
import java.net.HttpURLConnection;
import java.net.MalformedURLException;
import java.net.URL;
import java.security.KeyManagementException;
import java.security.NoSuchAlgorithmException;
import java.security.cert.CertificateException;
import java.security.cert.X509Certificate;
import javax.net.ssl.HostnameVerifier;
import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLSession;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;

/**
 * HTTP接続を作成・保持するクラス
 */
public class HttpConnCreator {

    private HttpURLConnection conn;
    private String baseUrl;
    private int responseCode;
    private String responseBody;
    private String requestMethod;
	private boolean useSsl;

	// TODO move to message resource file
	private static final String MSG_ERROR_CONNECT_SERVER = "An error occurred in connecting AR server. process was aborted";

	/**
	 * constructor
	 * <br />デフォルトでは、requestMethodはGET、SSLは使用しない
	 */
	public HttpConnCreator() {
		conn = null;
		baseUrl = null;
		responseCode = 0;
		requestMethod = "GET";
	}

	/**
	 * 接続先URLを設定する
	 * @param s 接続先URLの文字列
	 */
    public void setURL(String s)
    {
        baseUrl = s;
//		Logger logger = LoggerManager.getInstance().getLogger();
//		logger.info((new StringBuilder()).append("BaseURL=").append(baseUrl).toString());
    }
	/**
	 * HTTP接続を作成してリクエストを取得する
	 * @param s POSTの場合に送信する内容を指定する。GETの場合は使用しない
	 * @return HTTPのレスポンス
	 */
    public String create(String s) {
//      Logger logger;
//		OutputStream outputstream;
//		OutputStreamWriter outputstreamwriter;
        InputStream inputstream;
        InputStreamReader inputstreamreader;
        BufferedReader bufferedreader;
        StringBuffer stringbuffer;
//		logger = LoggerManager.getInstance().getLogger();
//		logger.info((new StringBuilder()).append("GET body=").append(s).toString());

//		outputstream = null;
//		outputstreamwriter = null;
        inputstream = null;
        inputstreamreader = null;
        bufferedreader = null;
        stringbuffer = new StringBuffer();
        URL url = null;
		try {
			url = new URL(baseUrl);
		} catch (MalformedURLException e) {
			// TODO 自動生成された catch ブロック
			System.out.println(MSG_ERROR_CONNECT_SERVER);
			e.printStackTrace();
			System.exit(1);
		}
//		logger.info((new StringBuilder()).append("URL=").append(url.toString()).toString());
		if (null == url) {
			System.out.println(MSG_ERROR_CONNECT_SERVER);
			System.exit(1);
		}

        try {
        	if (useSsl) {
                TrustManager[] tm = { new X509TrustManager() {

                    public X509Certificate[] getAcceptedIssuers() {
                        return null;
                    }

                    public void checkClientTrusted(X509Certificate[] chain,
                            String authType) throws CertificateException {
                    }

                    public void checkServerTrusted(X509Certificate[] chain,
                            String authType) throws CertificateException {
                    }
                } };

                //ホスト名の検証ルール 何が来てもtrueを返す
                HttpsURLConnection.setDefaultHostnameVerifier(new HostnameVerifier() {
                    public boolean verify(String hostname,
                            SSLSession session) {
                        return true;
                    }

                });

                SSLContext sslcontext = null;
        		try {
        			sslcontext = SSLContext.getInstance("SSL");
        		} catch (NoSuchAlgorithmException e) {
        			// TODO 自動生成された catch ブロック
        			System.out.println(MSG_ERROR_CONNECT_SERVER);
        			e.printStackTrace();
        			System.exit(1);
        		}
        		try {
        			sslcontext.init(null, tm, null);
        		} catch (KeyManagementException e) {
        			// TODO 自動生成された catch ブロック
        			System.out.println(MSG_ERROR_CONNECT_SERVER);
        			e.printStackTrace();
        			System.exit(1);
        		}

        		conn = (HttpsURLConnection)url.openConnection();
        		((HttpsURLConnection)conn).setSSLSocketFactory(sslcontext.getSocketFactory());
        	} else {
        		conn = (HttpURLConnection)url.openConnection();
        	}
			conn.setRequestMethod(requestMethod);
			conn.setRequestProperty("Accept", "application/json");
			conn.setRequestProperty("Content-Type", "application/json");
			conn.setDoOutput(true);
			conn.setUseCaches(false);
			/* disable POST method process */
//			if (requestMethod.equals("POST")) {
//				outputstream = conn.getOutputStream();
//				outputstreamwriter = new OutputStreamWriter(outputstream, "UTF-8");
//				outputstreamwriter.write(s);
//			}
			/* disable POST method process end */

			responseCode = conn.getResponseCode();
//			logger.info((new StringBuilder()).append("ResponseCode=").append(responseCode).toString());
			if(responseCode == 200 || responseCode == 201) {
				inputstream = conn.getInputStream();
			} else {
				inputstream = conn.getErrorStream();
			}
			inputstreamreader = new InputStreamReader(inputstream, "UTF-8");
			bufferedreader = new BufferedReader(inputstreamreader);
			String s1;
			while((s1 = bufferedreader.readLine()) != null) {
				stringbuffer.append(s1);
			}

			conn.disconnect();
			conn = null;
			responseBody = stringbuffer.toString();
//			logger.info((new StringBuilder()).append("responseBody=").append(responseBody).toString());

//			outputstreamwriter.close();

		} catch (IOException e) {
//			logger.log(Level.SEVERE, "Caught IOException", e);
			// TODO 自動生成された catch ブロック
			System.out.println(MSG_ERROR_CONNECT_SERVER);
			e.printStackTrace();
		} finally {
			try {
//				outputstreamwriter.close();
//				outputstream.close();

				if (bufferedreader != null) {
					bufferedreader.close();
				}
				if (inputstreamreader != null) {
					inputstreamreader.close();
				}
				if (inputstream != null) {
					inputstream.close();
				}
			} catch (IOException e) {
				// NOP
			}
		}

		return responseBody;
	}
	/**
	 * 
	 * @return HTTPのレスポンスコード
	 */
	public int getResponseCode() {
		return responseCode;
	}

	/**
	 * requestMethodを設定する。GETまたはPOSTのどちらか
	 * @param method requestMethod
	 */
	/* disable POST method process */
//	public void setRequestMethod(String method) {
//		requestMethod = method;
//	}
	/* disable POST method process end */

	/**
	 * SSLを使用するかどうかを設定する。true: 使用する、false: 使用しない
	 * @param useSsl SSLを使用するかどうか。true: SSLを使用する、false: SSLを使用しない
	 */
	public void setUseSsl(boolean useSsl) {
		this.useSsl = useSsl;
	}
}
