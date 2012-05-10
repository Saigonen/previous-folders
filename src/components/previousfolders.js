Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

function PreviousFolders() {}

PreviousFolders.prototype =
{
	classDescription: "PreviousFolders",
	classID: Components.ID("{e65c9740-3367-11df-9aae-0800200c9a66}"),
	contractID: "@sapa.mine.nu/previousfolders;1",

	_xpcom_categories: [{category: "profile-after-change"}],

	QueryInterface: XPCOMUtils.generateQI([
		Components.interfaces.nsIObserver,
		Components.interfaces.nsISupports,
		Components.interfaces.nsISupportsWeakReference]),

	// nsIObserver
	observe: function(subject, topic, data)
	{
		// Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService).logStringMessage("PreviousFolders: observe called");
		switch (topic)
		{
			case "profile-after-change":
				this.listener = new PreviousFoldersDownloadProgressListener();
				Components.classes["@mozilla.org/download-manager;1"].getService(Components.interfaces.nsIDownloadManager).addListener(this.listener);
				Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService).addObserver(this, "private-browsing", true);
				Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService).addObserver(this, "quit-application", true);
				break;
			
			case "private-browsing":
				if (data == "enter")
				{
					let prefManager = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
					let save_pref = prefManager.getBoolPref("extensions.previousfolders.saveToRegistry");
					prefManager.setBoolPref("extensions.previousfolders.saveToRegistryBackup", save_pref);
					prefManager.setBoolPref("extensions.previousfolders.saveToRegistry", false);
				} else if (data == "exit")
				{
					let prefManager = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
					let save_pref = prefManager.getBoolPref("extensions.previousfolders.saveToRegistryBackup");
					prefManager.setBoolPref("extensions.previousfolders.saveToRegistry", save_pref);
					prefManager.clearUserPref("extensions.previousfolders.saveToRegistryBackup");
				}
				break;
			
			case "quit-application":
				Components.classes["@mozilla.org/download-manager;1"].getService(Components.interfaces.nsIDownloadManager).removeListener(this.listener);
				Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService).removeObserver(this, "private-browsing");
				Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService).removeObserver(this, "quit-application");
				break;
		}
	}
}

function PreviousFoldersDownloadProgressListener() {}

PreviousFoldersDownloadProgressListener.prototype =
{	
	// nsIDownloadProgressListener
	onDownloadStateChange: function(state, download)
	{
		// Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService).logStringMessage("PreviousFolders: onDownloadStateChange called");
		let prefManager = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
		switch (download.state)
		{
			case 	Components.interfaces.nsIDownloadManager.DOWNLOAD_DOWNLOADING:  
				let save_pref = prefManager.getBoolPref("extensions.previousfolders.saveToRegistry");
				if (save_pref)
				{
					this.addRegistryKey(download);
				}
				break;
			case Components.interfaces.nsIDownloadManager.DOWNLOAD_FINISHED:
				let remove_pref = prefManager.getBoolPref("extensions.previousfolders.removeDownload");
				if (remove_pref)
				{
					this.removeDownloadByExtension(download);
				}
				break;
		}
	},

	onProgressChange: function() {},
	onSecurityChange: function() {},
	onStateChange: function() {},

	addRegistryKey: function(download)
	{
		// Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService).logStringMessage("PreviousFolders: addRegistryKey called");
		let os = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULRuntime).OS;
		if (os != "WINNT")
		{
			return; // Not using Windows, there's nothing we can do
		}
		let wrk = Components.classes["@mozilla.org/windows-registry-key;1"].createInstance(Components.interfaces.nsIWindowsRegKey);
		let keys = new Array();
		keys[0] = "Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\TypedPaths"; // Windows 7
		keys[1] = "Software\\Microsoft\\Internet Explorer\\TypedURLs"; // Windows Vista (and Windows XP)
		let keyFound = false;
		for (let i=0; i<keys.length; i++)
		{
			try
			{
				wrk.open(wrk.ROOT_KEY_CURRENT_USER, keys[i], wrk.ACCESS_ALL);
				keyFound = true;
				break;
			} catch (ex) {}
		}
		if (!keyFound)
		{
			return; // A valid key was not found in registry, there's nothing we can do
		}
		let prefManager = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
		let ignoreTemp_pref = prefManager.getBoolPref("extensions.previousfolders.ignoreTempFolder");
		let tempFolder = Components.classes["@mozilla.org/process/environment;1"].getService(Components.interfaces.nsIEnvironment).get("TEMP");
		let file = download.targetFile;
		if ((file.parent.path != tempFolder) || !ignoreTemp_pref)
		{
			let values = new Array();
			values.push(file.parent.path);
			for (let i=0; i<wrk.valueCount; i++)
			{
				let name  = wrk.getValueName(i);
				let value = wrk.readStringValue(name);
				if (value != file.parent.path)
					values.push(value);
			}
			let maxValues = 25; // url1...url25
			if (values.length < maxValues) maxValues = values.length;
			for (let i=0; i<maxValues; i++)
			{
				wrk.writeStringValue("url"+(i+1), values[i]);
			}
		}
		wrk.close();
	},

	removeDownloadByExtension: function(download)
	{
		// Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService).logStringMessage("PreviousFolders: removeDownloadByExtension called");
		let prefManager = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
		let extensions_pref = prefManager.getCharPref("extensions.previousfolders.extensionList");
		let extensions = extensions_pref.split(";");
		for (let i=0; i<extensions.length; i++)
		{
			if (extensions[i] != null && extensions[i] != "")
			{
				let pattern = new RegExp("\." + extensions[i] + "$","i");
				if (pattern.test(download.displayName))
				{
					Components.classes["@mozilla.org/download-manager;1"].getService(Components.interfaces.nsIDownloadManager).removeDownload(download.id);
				}
			}
		}
	}
}


/**
* XPCOMUtils.generateNSGetFactory was introduced in Mozilla 2 (Firefox 4).
* XPCOMUtils.generateNSGetModule is for Mozilla 1.9.2 (Firefox 3.6).
*/
if (XPCOMUtils.generateNSGetFactory)
	var NSGetFactory = XPCOMUtils.generateNSGetFactory([PreviousFolders]);
else
	var NSGetModule = XPCOMUtils.generateNSGetModule([PreviousFolders]);
