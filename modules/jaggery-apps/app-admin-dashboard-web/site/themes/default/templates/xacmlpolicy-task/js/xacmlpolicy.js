/*
 *  Copyright (c) 2014, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 *  WSO2 Inc. licenses this file to you under the Apache License,
 *  Version 2.0 (the "License"); you may not use this file except
 *  in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */


policyPartialsArray = new Array(); // xacml policy details array
var editedpolicyPartialId = 0; //if 1 then edit else save
var context = "/admin-dashboard";
var tags =[];
var editor;

function completeAfter(cm, pred) {
    var cur = cm.getCursor();
    if (!pred || pred()) setTimeout(function() {
        if (!cm.state.completionActive)
            cm.showHint({completeSingle: false});
    }, 100);
    return CodeMirror.Pass;
}

function completeIfAfterLt(cm) {
    return completeAfter(cm, function() {
        var cur = cm.getCursor();
        return cm.getRange(CodeMirror.Pos(cur.line, cur.ch - 1), cur) == "<";
    });
}

function completeIfInTag(cm) {
    return completeAfter(cm, function() {
        var tok = cm.getTokenAt(cm.getCursor());
        if (tok.type == "string" && (!/['"]/.test(tok.string.charAt(tok.string.length - 1)) || tok.string.length == 1)) return false;
        var inner = CodeMirror.innerMode(cm.getMode(), tok.state).state;
        return inner.tagName;
    });
}



$(document).ready(function () {
     editor = CodeMirror.fromTextArea(document.getElementById("policy-content"), {
        mode: "xml",
        lineNumbers: true,
        lineWrapping:true,
        extraKeys: {
            "'<'": completeAfter,
            "'/'": completeIfAfterLt,
            "' '": completeIfInTag,
            "'='": completeIfInTag,
            "Ctrl-Space": "autocomplete"
        },
        hintOptions: {schemaInfo: tags}
    });
    //load default xacml policy condition
    getXacmlPolicyTemplate();

    // Get shared partials
    $.ajax({
        url: context + '/apis/xacmlpolicies/list',
        type: 'GET',
        contentType: 'application/json',
        dataType: 'json',
        success: function (data) {
            for (var i = 0; i < data.length; i++) {
                policyPartialsArray.push({
                    id: data[i].partialId,
                    policyPartialName: data[i].partialName,
                    policyPartial: data[i].partialContent,
                    isShared: data[i].isShared,
                    author: data[i].author,
                    description: data[i].description
                });
            }
            updatePolicyPartial();
        },
        error: function () {
        }
    });
    $('#policy-name').select();
});


//clear and reset controls
function resetControls() {
    editedpolicyPartialId = 0;
    getXacmlPolicyTemplate();
    $('#policy-desc').val("");
    $('#policy-name').prop("readonly", false);
    $('#policy-name').val("");
    $('#policy-name').select();

}

//load XACML template
function getXacmlPolicyTemplate() {
    $.ajax({
        url: context + '/apis/xacmlpolicies/template',
        type: 'GET',

        dataType: "text",
        success: function (response) {
            if (response != null) {
                editor.setValue(response);
                $('#policy-content').val(response);
            }
        },
        error: function (response) {
            alert('Error occured while fetching entitlement policy content', 'error');
        }
    });
}

//new button click event
$(document).on("click", "#btn-policy-new", function () {
    resetControls();
});

//validate event
$(document).on("click", "#btn-policy-partial-validate", function () {
    var policyContent = editor.getValue();
    var policyName = $('#policy-name').val();

    if (policyName == "") {
        alert("Policy name cannot be blank", "alert-danger");
        return;
    }
    if (policyContent == "") {
        alert("Policy content cannot be blank", "alert-danger");
        return;
    }
    validatePolicyPartial(policyContent, showMessageAfterValidation, displayValidationRequestException);

});

//save event
$(document).on("click", "#btn-policy-save", function () {
    var policyContent = editor.getValue();
    var policyName = $('#policy-name').val();

    if (policyName == "") {
        alert("Policy name cannot be blank", "alert-danger");
        return;
    }
    if (editor.getValue() == "") {
        alert("Policy content cannot be blank", "alert-danger");
        return;
    }

    validatePolicyPartial(policyContent, continueAddingEntitlementPolicyPartialAfterValidation, displayValidationRequestException);
});

//validate the condition
function validatePolicyPartial(policyPartial, onSuccess, onError) {

    $.ajax({
        url: context + '/apis/xacmlpolicies/validate',
        type: 'POST',
        async: false,
        contentType: 'application/x-www-form-urlencoded',
        data: {"policyPartial": policyPartial},
        success: onSuccess,
        error: function (response) {
            if (response.status == 500) {
                alert('Sorry, your session has expired');
                location.reload();
            } else {
                onError(respond);
            }
        }
    });
}


function continueAddingEntitlementPolicyPartialAfterValidation(response) {
    var response = JSON.parse(response);
    if (response.success) {
        response = response.response;
        if (response.isValid) {
            savePolicyPartial();
        } else {
            alert("Policy is not valid.", "alert-danger");
        }

    } else {
        alert("Could not complete validation.", "alert-danger");
    }
}


function showMessageAfterValidation(response) {
    var response = JSON.parse(response);
    if (response.success) {
        response = response.response;
        if (response.isValid) {
            alert("Policy is valid.", "alert-success");
        } else {
            alert("Policy is not valid.", "alert-danger");
        }

    } else {
        alert("Could not complete validation.", "alert-danger");
    }
}


function displayValidationRequestException() {
    alert('Error occured while validating the policy', 'error');
}


function savePolicyPartial() {

    var policyPartial = editor.getValue();
    var policyPartialName = $('#policy-name').val();
    var policyPartialDesc = $('#policy-desc').val();

    var provider = "";
    var isSharedPartial = true;
    if (editedpolicyPartialId == 0) { //add

        //check if the name is already saved
        if (policyPartialsArray.length > 0) {
            for (var i = 0; i < policyPartialsArray.length; i++) {
                if (policyPartialsArray[i].policyPartialName == policyPartialName) {
                    //if policy group name is already saved show an warning and return
                    alert("Cannot save Policy Group Name " + policyPartialName + " as it is already been saved. " +
                    "Please select a different name");
                    return;
                }
            }
        }

        $.ajax({
            url: context + '/apis/xacmlpolicies/save',
            type: 'POST',
            contentType: 'application/x-www-form-urlencoded',
            async: false,
            data: {
                "policyPartialName": policyPartialName,
                "policyPartial": policyPartial,
                "isSharedPartial": isSharedPartial,
                "policyPartialDesc": policyPartialDesc
            },
            success: function (data) {
                var returnedId = JSON.parse(data).response.id;
                editedpolicyPartialId = returnedId;
                policyPartialsArray.push({
                    id: returnedId,
                    policyPartialName: policyPartialName,
                    policyPartial: policyPartial,
                    isShared: isSharedPartial,
                    author: provider,
                    description: policyPartialDesc
                });
                updatePolicyPartial()
                alert("Policy Saved Successfully");
                $('#policy-name').prop("readonly", true);
            },
            error: function () {
            }
        });

    } else { // update
        var policyPartialObj;

        $.each(policyPartialsArray, function (index, obj) {
            if (obj != null && obj.id == editedpolicyPartialId) {
                policyPartialObj = obj;
                return false; // break
            }

        });

        $.ajax({
            async: false,
            url: context + '/apis/xacmlpolicies/associated/apps',
            data: {"policyId": editedpolicyPartialId},
            type: 'GET',
            contentType: 'application/json',
            dataType: 'json',
            success: function (response) {

                var apps = "";
                if (response.length != 0) {
                    // construct and show the  the warning message with app names which use this partial before update
                    for (var i = 0; i < response.length; i++) {
                        var j = i + 1;
                        apps = apps + j + ". " + response[i].appName + "\n";
                    }

                    var msg = "policy " + policyPartialName + " is used in following apps " +
                        apps +
                        "Are you sure you want to modify the policy " + policyPartialName + "?";

                    var conf = confirm(msg);
                    if (conf == true) {
                        updateModifiedPolicyPartial(editedpolicyPartialId, policyPartialName, policyPartial, isSharedPartial, policyPartialDesc);
                    }
                }
                else {
                    updateModifiedPolicyPartial(editedpolicyPartialId, policyPartialName, policyPartial, isSharedPartial, policyPartialDesc);
                }


            },
            error: function (response) {
            }
        });


    }

    resetControls();

}


function updateModifiedPolicyPartial(editedpolicyPartialId, policyPartialName, policyPartial, isSharedPartial, policyPartialDesc) {
    $.ajax({
        url: context + '/apis/xacmlpolicies/update',
        type: 'POST',
        contentType: 'application/x-www-form-urlencoded',
        async: false,
        data: {
            "id": editedpolicyPartialId,
            "policyPartial": policyPartial,
            "isSharedPartial": isSharedPartial,
            "policyPartialDesc": policyPartialDesc
        },
        success: function (data) {
            if (JSON.parse(data)) {
                $.each(policyPartialsArray, function (index, obj) {
                    if (obj != null && obj.id == editedpolicyPartialId) {
                        policyPartialsArray[index].policyPartialName = policyPartialName;
                        policyPartialsArray[index].policyPartial = policyPartial;
                        policyPartialsArray[index].isShared = isSharedPartial;
                        policyPartialsArray[index].description = policyPartialDesc

                    }
                });
                updatePolicyPartial();
                alert("Policy Updated Successfully");
                resetControls();
            } else {
                alert("Couldn't modify .This partial is being used by web apps ");
            }
        },
        error: function () {
        }
    });
}


function updatePolicyPartial() {
    $('#policyPartialsTable tbody').html("");
    $.each(policyPartialsArray, function (index, obj) {
        if (obj != null) {

            if (obj.isShared) {
                var policyDesc = obj.description;
                if (policyDesc == null) {
                    policyDesc = "";
                }

                $('#policyPartialsTable tbody').append('<tr><td>' + obj.policyPartialName + '</td> <td>' +
                policyDesc + '</td> <td><a data-target="#entitlement-policy-editor" ' +
                'data-toggle="modal" data-policy-id="' + obj.id + '" class="policy-edit-button">' +
                '<i class="icon-edit"></i></a> &nbsp;<a  data-policy-name="' + obj.policyPartialName +
                '"  data-policy-id="' + obj.id + '" class="policy-delete-button"><i class="icon-trash"></i>' +
                '</a></td></tr>');

            }

        }
    });

}

//edit event
$(document).on("click", ".policy-edit-button", function () {
    var policyId = $(this).data("policyId");
    editedpolicyPartialId = policyId;
    $('#policy-content').val("");
    $('#policy-name').val("");
    $('#policy-desc').val("");
    editor.setValue("");

    $.each(policyPartialsArray, function (index, obj) {
        if (obj != null && obj.id == policyId) {
            $('#policy-name').val(obj.policyPartialName);
            $('#policy-name').prop("readonly", true);
            $('#policy-desc').val(obj.description);
            $('#policy-content').val(obj.policyPartial);
            editor.setValue(obj.policyPartial);

        }
    });
});


//delete event


$(document).on("click", ".policy-delete-button", function () {

    var policyName = $(this).data("policyName");
    var policyId = $(this).data("policyId");
    var policyPartial;
    var arrayIndex;
    var conf;
    $.each(policyPartialsArray, function (index, obj) {
        if (obj != null && obj.id == policyId) {
            policyPartial = obj;
            arrayIndex = index;
            return false; // break
        }

    });

    if (policyPartial.isShared) {
        $.ajax({
            async: false,
            url: context + '/apis/xacmlpolicies/associated/apps',
            data: {"policyId": policyId},
            type: 'GET',
            contentType: 'application/json',
            dataType: 'json',
            success: function (response) {
                var apps = "";
                if (response.length != 0) {
                    // construct and show the  the warning message with app names which use this partial before delete
                    for (var i = 0; i < response.length; i++) {
                        var j = i + 1;
                        apps = apps + j + ". " + response[i].appName + "\n";

                    }
                    var msg = "You cannot delete the policy " + policyName + " because it is been used in following apps\n\n" +
                        apps;
                    alert(msg);
                    return;

                } else {
                    conf = confirm("Are you sure you want to delete the policy " + policyName + "?");
                }

            },
            error: function (response) {
                if (response.status==500){
                    alert('Sorry, your session has expired');
                    location.reload();
                }
            }
        });

    }

    if (conf == true) {

        $.ajax({

            url: context + '/apis/xacmlpolicies/delete/' + policyId,
            type: 'DELETE',
            contentType: 'application/json',
            dataType: 'json',
            success: function (response) {

                var success = JSON.parse(response);
                if (success) {
                    delete policyPartialsArray[arrayIndex];
                    updatePolicyPartial();


                } else {
                    alert("Couldn't delete the partial.This partial is being used by web apps  ");
                }

            },
            error: function (response) {
                alert('Error occured while fetching entitlement policy content', 'error');
            }
        });

    }

});
