/**
 * previousfolders namespace.
 */
if ("undefined" == typeof(previousfolders)) {
	var previousfolders = {};
};

previousfolders.options =
{
	init : function()
	{
		let privateBrowsingEnabled = Components.classes["@mozilla.org/privatebrowsing;1"].getService(Components.interfaces.nsIPrivateBrowsingService).privateBrowsingEnabled;
		if (privateBrowsingEnabled)
		{
			document.getElementById("previousfolders-pbm-box").removeAttribute("hidden");
			this.disableSave(true);
			this.disableTemp(true);
		} else
		{
			let saveChecked = document.getElementById("previousfolders-save-check").checked;
			this.disableTemp(!saveChecked);
		}
		
		this.initClearContentButton();
				
		let removeChecked = document.getElementById("previousfolders-remove-check").checked;
		this.disableExtensions(!removeChecked);
	},
		
	disableSave : function(disable)
	{
		if (disable)
		{
			document.getElementById("previousfolders-save-check").setAttribute("disabled", true);
		} else
		{
			document.getElementById("previousfolders-save-check").removeAttribute("disabled");
		}
	},
	
	disableTemp : function(disable)
	{
		if (disable)
		{
			document.getElementById("previousfolders-temp-check").setAttribute("disabled", true);
		} else
		{
			document.getElementById("previousfolders-temp-check").removeAttribute("disabled");
		}
	},
	
	disableExtensions : function(disable)
	{
		if (disable)
		{
			document.getElementById("previousfolders-extensions-label").setAttribute("disabled", true);
			document.getElementById("previousfolders-extensions-textbox").setAttribute("disabled", true);
		} else
		{
			document.getElementById("previousfolders-extensions-label").removeAttribute("disabled");
			document.getElementById("previousfolders-extensions-textbox").removeAttribute("disabled");
		}
	},

	initClearContentButton : function()
	{
		let stringBundle = document.getElementById("previousfolders-string-bundle");
		let clearContentButton = document.getElementById("previousfolders-clearcontent-button");
		let count = this.countContentPrefs();
		if (count == 0)
		{
			clearContentButton.setAttribute("disabled", "true");
			let tooltip = stringBundle.getString("previousfolders-clearcontent-button-disabledtooltip");
			clearContentButton.setAttribute("tooltiptext", tooltip);
		} else
		{
			clearContentButton.removeAttribute("disabled");
			let tooltip = stringBundle.getString("previousfolders-clearcontent-button-enabledtooltip");
			tooltip = tooltip.replace("%1", count);
			clearContentButton.setAttribute("tooltiptext", tooltip);
		}
	},

	clearContentPrefs : function()
	{
		let count = this.countContentPrefs();
		try
		{
			Components.classes["@mozilla.org/content-pref/service;1"].getService(Components.interfaces.nsIContentPrefService).removePrefsByName("browser.download.lastDir");

		} catch (ex)
		{
			// We don't need to do anything, settings are cleared regardless.
			// Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService).logStringMessage("Previous Folders: " + ex);
		}
		this.initClearContentButton();
	},
	
	countContentPrefs : function()
	{
		let count = 0;
		let enumerator = Components.classes["@mozilla.org/content-pref/service;1"].getService(Components.interfaces.nsIContentPrefService).getPrefsByName("browser.download.lastDir").enumerator;
		while (enumerator.hasMoreElements())
		{
			enumerator.getNext();
			count++;
		}
		return count;
	}
};
