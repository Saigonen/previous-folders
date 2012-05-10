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
		switch (topic)
		{
			case "profile-after-change":
				this.listener = new PreviousFoldersDownloadProgressListener();
				Components.classes["@mozilla.org/download-manager;1"].getService(Components.interfaces.nsIDownloadManager).addListener(this.listener);
				Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService).addObserver(this, "quit-application", true);
				break;
			
			case "quit-application":
				Components.classes["@mozilla.org/download-manager;1"].getService(Components.interfaces.nsIDownloadManager).removeListener(this.listener);
				Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService).removeObserver(this, "quit-application");
				break;
		}
	}
}

function PreviousFoldersDownloadProgressListener()
{
	let os = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULRuntime).OS;
	if (os == "WINNT")
	{
		this._wrk = Components.classes["@mozilla.org/windows-registry-key;1"].createInstance(Components.interfaces.nsIWindowsRegKey);
		let keys = new Array();
		keys[0] = "Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\TypedPaths"; // Windows 7
		keys[1] = "Software\\Microsoft\\Internet Explorer\\TypedURLs"; // Windows Vista (and Windows XP)
		for (let i=0; i<keys.length; i++)
		{
			try
			{
				this._wrk.open(this._wrk.ROOT_KEY_CURRENT_USER, keys[i], this._wrk.ACCESS_BASIC);
				this._key = keys[i];
				this._wrk.close();
				break;
			} catch (ex) {}
		}
	}
}

PreviousFoldersDownloadProgressListener.prototype =
{	
	_pbs: Components.classes["@mozilla.org/privatebrowsing;1"].getService(Components.interfaces.nsIPrivateBrowsingService),
	_prefs: Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch),
	_env: Components.classes["@mozilla.org/process/environment;1"].getService(Components.interfaces.nsIEnvironment),
	_dm: Components.classes["@mozilla.org/download-manager;1"].getService(Components.interfaces.nsIDownloadManager),

	// nsIDownloadProgressListener
	onDownloadStateChange: function(state, download)
	{
		switch (download.state)
		{
			case 	Components.interfaces.nsIDownloadManager.DOWNLOAD_DOWNLOADING:  
				let save_pref = this._prefs.getBoolPref("extensions.previousfolders.saveToRegistry");
				let ignoreTemp_pref = this._prefs.getBoolPref("extensions.previousfolders.ignoreTempFolder");
				// Save to registry if saveToReqistry is true and we are not in PrivateBrowsingMode and download location does not match temp folder if ignoreTempFolder is true.
				if (save_pref && !this._pbs.privateBrowsingEnabled && !(ignoreTemp_pref && (download.targetFile.parent.path == this._env.get("TEMP"))))
				{
					this.addRegistryKey(download);
				}
				break;
			case Components.interfaces.nsIDownloadManager.DOWNLOAD_FINISHED:
				let remove_pref = this._prefs.getBoolPref("extensions.previousfolders.removeDownload");
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
		// Helper function for finding duplicate values in arrays.
		let contains = function(a, v) 
		{
			for(let i=0; i<a.length; i++)
				if (a[i] == v)	return true;
			return false;
		};

		// Try to open the registry key. No need for testing since we will just exit if not successful.
		try
		{
			this._wrk.open(this._wrk.ROOT_KEY_CURRENT_USER, this._key, this._wrk.ACCESS_ALL);
		} catch (ex)
		{
			//Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService).logStringMessage("Previous Folders: " + ex);
			return;
		}

		// Read the values from registry.
		let values = new Array();
		let pattern = new RegExp("^url\\d+$");
		for (let i=0; i<this._wrk.valueCount; i++)
		{
			let name  = this._wrk.getValueName(i);
			if (name.match(pattern))
			{
				let value = this._wrk.readStringValue(name);
				values[name.substr(3)] = value;
			}
		}
		// Add the new url and trim the values.
		let urls = new Array();
		urls.push(download.targetFile.parent.path);
		for (let i=0; i<values.length; i++)
		{
			if ((values[i] != undefined) && !contains(urls, values[i]))
				urls.push(values[i]);
		}
		// Limit the number of values to 25. This limit is set by Windows.
		let limit = 25;
		// Write values back to registry. Overwrite all the values from url1 to url25
		for (let i=0; i<limit; i++)
		{
			if (i<urls.length)
			{
				this._wrk.writeStringValue("url" + (i+1), urls[i]);
			} else
			{
				if (this._wrk.hasValue("url" + (i+1)))
					this._wrk.removeValue("url" + (i+1));
			}
		}
		this._wrk.close();
	},

	removeDownloadByExtension: function(download)
	{
		let extensions_pref = this._prefs.getCharPref("extensions.previousfolders.extensionList");
		let extensions = extensions_pref.split(";");
		for (let i=0; i<extensions.length; i++)
		{
			if (extensions[i] != null && extensions[i] != "")
			{
				let pattern = new RegExp("\." + extensions[i] + "$","i");
				if (download.displayName.match(pattern))
				{
					this._dm.removeDownload(download.id);
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
