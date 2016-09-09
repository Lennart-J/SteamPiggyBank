import requests
import json    
import os
import zipfile
import copy


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
    print("generateAccessToken: ", r)
    return json.loads(r.text)["access_token"]


def uploadToCWS(pathToCrx):
    requestUri = "https://www.googleapis.com/upload/chromewebstore/v1.1/items/" + EXTENSION_ID
    headers = {"Authorization":"Bearer " + ACCESS_TOKEN, "x-goog-api-version": "2"}
    spb = open(pathToCrx,'rb').read()
    r = requests.put(requestUri, data=spb, headers=headers, params={'file': pathToCrx})
    print("uploadToCws: ", r)
    if json.loads(r.text)["uploadState"] == "SUCCESS":
        print "Success" 
    else:
        print json.loads(r.text)


def publishOnCWS():
    requestUri = "https://www.googleapis.com/chromewebstore/v1.1/items/" + EXTENSION_ID+ "/publish"
    headers = {"Authorization":"Bearer " + ACCESS_TOKEN, "x-goog-api-version": "2"}
    #if ($asBeta) {
    #    $headers.Add("publishTarget","trustedTesters")
    #}
    r = requests.post(requestUri, headers=headers)
    print("publishOnCws: ", r)


def makeZip(zip_path):
    script_dir = os.path.dirname(__file__)
    ignore_files = [u'SteamPiggyBank.zip' ,u'cws.py', u'README.md', u'sass_quicklaunch.bat']
    ignore_dirs = ['./', '../', '.git']
    ignore_roots = [os.path.join(script_dir, x) for x in ignore_dirs]
    
    zf = zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED)
    for root, dirs, files in os.walk(script_dir + "/../"):
        tmp_root = copy.deepcopy(root)
        if tmp_root in ignore_roots:
            continue
        
        for dir in dirs:
            if dir in ignore_dirs:
                dirs.remove(dir)
        
        tmp_files =  copy.deepcopy(files)
        for file in tmp_files:
            if file in ignore_files:
                files.remove(file)
                
        zf.write(root, os.path.relpath(root, script_dir))
        for file in files:
            filename = os.path.join(root, file)
            if os.path.isfile(filename) and filename not in ignore_files:
                arcname = os.path.join(os.path.relpath(root, script_dir), file)
                zf.write(filename, arcname)
    zf.close()


zip_path = os.path.dirname(__file__) + "/../SteamPiggyBank.zip"
ACCESS_TOKEN = generateAccessToken()
makeZip(zip_path)
#uploadToCWS(zip_path)
#publishOnCWS()
