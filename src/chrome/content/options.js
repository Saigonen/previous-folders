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
			previousfolders.options.showPBMMessage();
			previousfolders.options.disableSave(true);
			previousfolders.options.disableTemp(true);
		} else
		{
			let saveChecked = document.getElementById("previousfolders-save-check").checked;
			previousfolders.options.disableTemp(!saveChecked);
		}	
		let removeChecked = document.getElementById("previousfolders-remove-check").checked;
		previousfolders.options.disableExtensions(!removeChecked);
	},
	
	showPBMMessage : function()
	{
		let desc = document.createElement("description");
		desc.setAttribute("id", "previousfolders-pbm-desc");
		desc.setAttribute("style", "color:purple");
		let stringBundle = document.getElementById("previousfolders-string-bundle");
		let descString = stringBundle.getString("privateBrowsingMode");
		let descTooltip = stringBundle.getString("privateBrowsingModeTooltip");
		desc.setAttribute("value", descString);
		desc.setAttribute("tooltiptext", descTooltip);
		let box = document.createElement("box");
		box.setAttribute("pack", "center");
		box.appendChild(desc);
		let saveCheck = document.getElementById("previousfolders-save-check");
		saveCheck.parentNode.insertBefore(box, saveCheck);
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
	}
};
