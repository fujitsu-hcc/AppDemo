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
import java.util.HashMap;
import java.util.List;
import java.util.Map;


public class SimpleJson2
{
	private String rawdata;
	private int pos;

	public SimpleJson2()
	{
	}

	public Object parse(String raw)
  {
		if(raw == null || raw.length() == 0)
			return null;

			rawdata = raw;
			char c = '\0';
			Object result = null;
			for(pos = 0; pos < rawdata.length(); pos++)
			{
				c = rawdata.charAt(pos);
				if(c == '{')
				{
					result = parseObject();
					continue;
				}
				if(c == '[')
					result = parseArray();
			}

			return result;
	}

	private Map parseObject()
  {
		Map result = new HashMap();
		char c = '\0';
		String key = null;
		boolean isLeft = true;

		for(pos++; pos < rawdata.length(); pos++)
      {
			c = rawdata.charAt(pos);
			if(isIgnoreChar(c))
				continue;
			if(c == '}')
				break;
			if(c == '[')
          {
				result.put(key, parseArray());
				continue;
          }
			if(c == '{')
          {
				result.put(key, parseObject());
				continue;
          }
			if(c == ':')
          {
				isLeft = false;
				continue;
          }
			if(c == ',')
          {
				isLeft = true;
				continue;
          }
          String v;
			if(c == '"' || c == '\'')
          {
				if(isLeft)
              {
					key = getQuotedString(c);
					continue;
              }
				v = getQuotedString(c);
				if(isLong(v))
              {
					try
					{
						result.put(key, new Long(Long.parseLong(v)));
					}
					catch(NumberFormatException e)
					{
						result.put(key, v);
					}
					continue;
              }
				if(isFloat(v))
				{
					try
					{
						result.put(key, new Float(Float.parseFloat(v)));
					}
					catch(NumberFormatException e)
					{
						result.put(key, v);
					}
				}
				else
					result.put(key, v);
				continue;
          }
			if(isLeft)
          {
				key = getString();
				continue;
          }
			v = getString();
			if(isLong(v))
          {
				try
				{
					result.put(key, new Long(Long.parseLong(v)));
				}
				catch(NumberFormatException e)
				{
					result.put(key, v);
				}
				continue;
          }
          if(isFloat(v))
          {
              result.put(key, getString());
				try
				{
					result.put(key, new Float(Float.parseFloat(v)));
				}
				catch(NumberFormatException e)
				{
					result.put(key, v);
				}
          } else
          {
              result.put(key, v);
          }
      }
      return result;
	}

  private List parseArray()
	{
		        List result = new ArrayList();
		        char c = '\0';
		        for(pos++; pos < rawdata.length(); pos++)
              {
		            c = rawdata.charAt(pos);
		            if(isIgnoreChar(c))
		                continue;
		            if(c == ']')
		                break;
		            if(c == '[')
                  {
		                result.add(parseArray());
		                continue;
                  }
		            if(c == '{')
                  {
		                result.add(parseObject());
		                continue;
                  }
		            if(c == ',')
		                continue;
                  String v;
		            if(c == '"' || c == '\'')
                  {
		                v = getQuotedString(c);
		                if(isLong(v))
                      {
							try
							{
								result.add(new Long(Long.parseLong(v)));
							}
							catch(NumberFormatException e)
							{
								result.add(v);
							}
							continue;
                      }
		                if(isFloat(v))
						{
							try
							{
								result.add(new Float(Float.parseFloat(v)));
							}
							catch(NumberFormatException e)
							{
								result.add(v);
							}
						}
		                else
						{
		                    result.add(v);
						}
		                continue;
                  }
		            v = getString();
		            if(isLong(v))
                  {
						try
						{
							result.add(new Long(Long.parseLong(v)));
						}
						catch(NumberFormatException e)
						{
							result.add(v);
						}
						continue;
                  }
		            if(isFloat(v))
					{
						try
						{
							result.add(new Float(Float.parseFloat(v)));
						}
						catch(NumberFormatException e)
						{
							result.add(v);
						}
					}
		            else
					{
		                result.add(v);
					}
              }
		        return result;
	}
  private boolean isLong(String v)
  {
		        if(v == null || v.length() == 0)
		            return false;
		        char c = '\0';
		        for(int i = 0; i < v.length(); i++)
              {
		            c = v.charAt(i);
		            if(!Character.isDigit(c))
		                return false;
              }
		        return true;
	}

  private boolean isFloat(String v)
	{
      if(v == null || v.length() == 0)
          return false;
      char c = '\0';
      for(int i = 0; i < v.length(); i++)
      {
          c = v.charAt(i);
          if(!Character.isDigit(c) && c != '.')
              return false;
      }
      return true;
	}

	private String getQuotedString(char quote)
  {
      int start = pos + 1;
      int stop = start;
      char c = '\0';
      do
      {
          if(stop >= rawdata.length())
		                break;
		            c = rawdata.charAt(stop);
		            if(c == quote && rawdata.charAt(stop - 1) != '\\')
		                break;
		            stop++;
		} while(true);
	    pos = stop;
	    return rawdata.substring(start, stop);
	}

	private String getString()
  {
      int start = pos;
      int stop = start;
      boolean detectStop = false;
      char c = '\0';
      do
		{
          if(stop >= rawdata.length())
              break;
          c = rawdata.charAt(stop);
          switch(c)
          {
          case 44:
          case 58:
          case 93:
          case 125:
              detectStop = true;
              break;
          }
          if(detectStop)
              break;
          stop++;
		} while(true);
		pos = stop - 1;
	    return rawdata.substring(start, stop);
	}

	private boolean isIgnoreChar(char c)
  {
      switch(c)
      {
      case 9:
      case 10:
      case 13:
      case 32:
          return true;
      }
      return false;
	}

	public static Long getLongValue(Map json, String key)
  {
		if(json == null || key == null)
      {
	    	return null;
		} else
      {
			Object o = json.get(key);
			return getLongValue(o);
		}
	}

	public static Float getFloatValue(Map json, String key)
	{
		if(json == null || key == null)
		{
			return null;
		} else
		{
			Object o = json.get(key);
			return getFloatValue(o);
		}
	}

	public static String getStringValue(Map json, String key)
	{
		if(json == null || key == null)
		{
			return null;
		} else
		{
			Object o = json.get(key);
			return getStringValue(o);
		}
	}

	public static Map getJsonObject(Map json, String key)
	{
		if(json == null || key == null)
		{
			return null;
		} else
		{
			Object o = json.get(key);
			return getJsonObject(o);
		}
	}

	public static List getJsonArray(Map json, String key)
	{
		if(json == null || key == null)
		{
			return null;
		} else
		{
			Object o = json.get(key);
			return getJsonArray(o);
			}
	}

	public static Long getLongValue(Object val)
	{
		if(val instanceof Long)
			return (Long)val;
		else
			return null;
	}

	public static Float getFloatValue(Object val)
	{
		if(val instanceof Float)
			return (Float)val;
		else
			return null;
	}

	public static String getStringValue(Object val)
	{
		if(val instanceof String)
			return (String)val;
		else
			return null;
	}

	public static Map getJsonObject(Object val)
	{
		if(val instanceof HashMap)
			return (HashMap)val;
		else
			return null;
	}
	public static List getJsonArray(Object val)
	{
		if(val instanceof ArrayList)
			return (ArrayList)val;
		else
			return null;
	}
}
