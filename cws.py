import urlparse
import httplib
import requests
import json

EXTENSION_ID = "mnadageogkcibhmepnladdkgajhppakd"
CLIENT_ID = "601615110081-t5a07gftg1b2btr4j2rgu0fmeg5v1641.apps.googleusercontent.com"
CLIENT_SECRET = "14A5t3_e-ouhFQpvlNlu6m0c"
CODE = "4/6UVptwiQc55HhRPavfWjXc27s6wMJCY7YyhXnF-2tnA"
CODE_URL = "https://accounts.google.com/o/oauth2/auth"
REFRESH_TOKEN = "1/32vdgnE37Diu_mpUwyz8368Oh-00rd_a0dG34eBQCQc"
ACCESS_TOKEN = ""

def generateAccessToken():
    url = "https://www.googleapis.com/oauth2/v3/token?"
    
    params = {'client_id': CLIENT_ID, 'client_secret': CLIENT_SECRET,
            'refresh_token': REFRESH_TOKEN, 'grant_type': "refresh_token"}
    
    r = requests.post(url, data=params)
    return json.loads(r.text)["access_token"]


def publishOnCWS():
    requestUri = "https://www.googleapis.com/chromewebstore/v1.1/items/" + EXTENSION_ID+ "/publish"
    headers = {"Authorization":"Bearer " + ACCESS_TOKEN, "x-goog-api-version": "2"}
    #if ($asBeta) {
    #    $headers.Add("publishTarget","trustedTesters")
    #}
    r = requests.post(requestUri, headers=headers)
    print(r)

ACCESS_TOKEN = generateAccessToken()
publishOnCWS()
# #!/bin/bash
# CLIENT_ID="601615110081-t5a07gftg1b2btr4j2rgu0fmeg5v1641.apps.googleusercontent.com"
# CLIENT_SECRET="14A5t3_e-ouhFQpvlNlu6m0c"
# CODE="4/6UVptwiQc55HhRPavfWjXc27s6wMJCY7YyhXnF-2tnA"
# CODE_URL="https://accounts.google.com/o/oauth2/auth"
# REFRESH_TOKEN="1/32vdgnE37Diu_mpUwyz8368Oh-00rd_a0dG34eBQCQc"
# ACCESS_TOKEN=""

# # response1=$(curl $CODE_URL -d \
# # "response_type=code&scope=https://www.googleapis.com/auth/chromewebstore&client_id=$CLIENT_ID&redirect_uri=urn:ietf:wg:oauth:2.0:oob")

# function generateAccessToken() {
#     local requestUri="https://www.googleapis.com/oauth2/v3/token"
#     local response=$(curl $requestUri -d \
#     "client_id=$CLIENT_ID&client_secret=$CLIENT_SECRET&refresh_token=$REFRESH_TOKEN&grant_type=refresh_token")
#     echo $response
#     ACCESS_TOKEN=$response.access_token
# }
# generateAccessToken
# echo $ACCESS_TOKEN
# # response=$(curl "https://accounts.google.com/o/oauth2/token" -d \
# # "client_id=$CLIENT_ID&client_secret=$CLIENT_SECRET&code=$CODE&grant_type=authorization_code&redirect_uri=urn:ietf:wg:oauth:2.0:oob")

# echo $response
