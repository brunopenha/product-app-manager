/*
*Copyright (c) 2005-2010, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
*
*WSO2 Inc. licenses this file to you under the Apache License,
*Version 2.0 (the "License"); you may not use this file except
*in compliance with the License.
*You may obtain a copy of the License at
*
*http://www.apache.org/licenses/LICENSE-2.0
*
*Unless required by applicable law or agreed to in writing,
*software distributed under the License is distributed on an
*"AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
*KIND, either express or implied.  See the License for the
*specific language governing permissions and limitations
*under the License.
*/

package org.wso2.carbon.appmanager.tests.util;


import org.json.JSONObject;
import org.wso2.carbon.automation.core.utils.HttpResponse;

public class VerificationUtil {
    public static void checkErrors(HttpResponse response) throws Exception {
        JSONObject jsonObject = new JSONObject(response.getData());
        if ((Boolean) jsonObject.get("error")) {
            throw new Exception("Operation not successful: " + jsonObject.get("message").toString());
        }
    }
    
    public static void checkAppCreateRes(HttpResponse response) throws Exception {
        JSONObject jsonObject = new JSONObject(response.getData());
        if (!(Boolean) jsonObject.get("ok")) {
            throw new Exception("Operation not successful: " + jsonObject.get("message").toString());
        }
    }
    
    public static void checkAppStateChange(HttpResponse response) throws Exception {
        JSONObject jsonObject = new JSONObject(response.getData());
        String status=(String)jsonObject.get("status");
        if (!status.equals("ok")) {
            throw new Exception("Operation not successful: " + jsonObject.get("message").toString());
        }
    }
    
    public static void checkCurrentAppState(HttpResponse response) throws Exception  {
        JSONObject jsonObject = new JSONObject(response.getData());
        if ((Boolean) jsonObject.get("subscribed")) {
            throw new Exception("Operation not successful: " + jsonObject.get("message").toString());
        }           
    }
}
