var util = {
//	host: 'http://192.168.1.113:8084',
	host: 'http://192.168.1.130:8080',
//	host: 'http://sy.teleii.com',
//	host: 'http://120.26.218.49:3000',
	mid: 'ceea86f3-bf5a-11e5-b8bf-ac853da4657b',
	token: localStorage.getItem('token') || '',
	wgtVer:null,
	
	ajax: function(params) {
		var loading = '请稍等...';
		plus.nativeUI.showWaiting(loading);
		mui.ajax({
			url: util.host + params.url,
			dataType: 'json',
			type: 'POST',
			data: params.data,
			beforeSend: function(req) {
				req.setRequestHeader('app','1.0.0');
				req.setRequestHeader('x-access-token', util.token);
			},
			timeout: 8000,
			success: function(data) {
				plus.nativeUI.closeWaiting();
				if (data.code == 0) {
					if (typeof params.success == 'function') {
						params.success(data);
					} else {
						mui.toast(data.msg);
					}
				} else {
					if (typeof params.error == 'function') {
						params.error(data);
					} else {
						mui.toast(data.msg);
					}
				}
			},
			error: function(err, status) {
				plus.nativeUI.closeWaiting();
				//失败后销毁，否则按返回键还是会回到main页面
				var webid = plus.webview.getWebviewById('main');
				plus.webview.close(webid);
				mui.toast('登陆过期，请重新登陆');
				var TIMEOUT = setTimeout(function() {
					mui.openWindow({
						url: 'index.html',
						id: 'index',
						show: {
							aniShow: 'slide-in-right',
							duration: 300
						}
					});
					window.clearTimeout(TIMEOUT);
				}, 1000);
			}
		});

	},
	//获取token
	getAccessToken: function(params) {
		plus.nativeUI.showWaiting('登陆中...');
		mui.ajax({
			url: util.host + '/getToken',
			type: 'POST',
			dataType: 'json',
			data: {
				mid: util.mid,
				username: params.phone,
				password: params.pwd
			},
			timeout: 14000,
			success: function(data) {
				plus.nativeUI.closeWaiting();
				if (data.code == 0) {
					localStorage.setItem('token', data.token);
					mui.toast('登陆成功！');
					mui.openWindow({
						url: 'main.html',
						id: 'main',
						show: {
							aniShow: 'slide-in-right',
							duration: 300,
						}
					});
				} else {
					mui.toast(data.msg);
				}
			},
			error: function(err) {
				plus.nativeUI.closeWaiting();
				mui.toast('网络连接超时');
			}
		});
	},

	//上传图片-老接口
	uploadImg: function(data, params) {
		var upload = new plupload.Uploader({
			runtimes: 'html5',
			browse_button: 'selectfiles',
			multipart_params:{
				'Filename': '${filename}',
				'key': data.key + '${filename}',
				'policy': data.policy,
				'OSSAccessKeyId': data.accessid,
				'success_action_status': '201', //让服务端返回201,不然，默认会返回204
				'signature': data.signature,
			},
			
			init: {
				PostInit: function() {
					document.getElementById('postfiles').onclick = function() {
						util.set_upload_param(data,upload);
						return false;
					};
				},
				FilesAdded: function(up, files) {
					plupload.each(files, function(file) {
						document.getElementById('infoImg').innerHTML = plupload.formatSize(file.size);
					});
				},
				UploadProgress: function(up, file) {
					plus.nativeUI.showWaiting(file.percent + '%');
					if (file.percent == 100) {
						plus.nativeUI.closeWaiting();
					}
				},
				FileUploaded: function(up, file, info) {
					if (info.status >= 200 || info.status < 200) {
						util.ajax({
							url: '/merchant/picture/add',
							data: {
								class_name: params.class_name,
								obj_uid: params.obj_uid,
								file_name: file.name
							},
							success: function(data) {
								mui.alert('上传成功','上传状态','关闭',function(){
									//关闭扫码
									var webid = plus.webview.getWebviewById('scan');
									plus.webview.close(webid);
								});
							},
							error: function(err) {
								mui.toast(err.msg);
							}
						});
					} else {
						mui.toast(info.response);
					}
				},
				Error: function(up, error) {
					mui.toast('网络错误');
				}
			}
		});
		upload.init();
	},

	//获取电话号码
	getPhoneNumber: function(phoneArr) {
		//如果存在多条电话,调用对话框
		if (phoneArr.length > 1) {
			var btns = [];
			for (var i = 0; i < phoneArr.length; i++) {
				btns.push({
					title: phoneArr[i].mask_phone,
					code: phoneArr[i].encrypt_phone
				});
			}
			plus.nativeUI.actionSheet({
				title: '选择电话号码',
				cancel: '取消',
				buttons: btns
			}, function(e) {
				//返回索引值，0是取消按钮，所以按钮排列是从上到下递增
				var index = e.index - 1;
				if (btns[index]) {
					util.callDial(btns[index].code);
				}
			});
		} else {
			if (phoneArr[0]) {
				util.callDial(phoneArr[0].encrypt_phone);
			} else {
				mui.toast('获取参数失败');
			}
		}
	},

	//拨打电话
	callDial: function(code) {
		if (code) {
			this.ajax({
				url: '/phone/bindDynamicMobile',
				data: {
					encrypt_phone: code
				},
				success: function(data) {
					if (data.value) {
						plus.device.dial(data.value, true);
					} else {
						mui.toast('无效号码');
					}
				}
			});
		}
	},

	//验证手机号码
	verifyPhone: function(str) {
		var reg = /^13\d{9}|14[57]\d{8}|15[012356789]\d{8}|18[012356789]\d{8}|17[0678]\d{8}$/;
		return reg.test(str);
	},

	//退出
	quiteApp: function() {
		var first = null;
		this.exit = function() {
			if (!first) {
				first = new Date().getTime();
				mui.toast('再按一次退出程序');
				setTimeout(function() {
					first = null;
				}, 2000);
			} else {
				if (new Date().getTime() - first < 2000) {
					plus.runtime.quit();
				}
			}
		}
	},
	// 检测更新
	checkUpdate: function(checkCb,downloadCb,installCb){
		plus.nativeUI.showWaiting("检测更新...");
    	var xhr=new XMLHttpRequest();
    	xhr.onreadystatechange=function(){
        	switch(xhr.readyState){
            	case 4:
	            plus.nativeUI.closeWaiting();
	            if(xhr.status==200){
	                var response = eval('(' + xhr.responseText + ')');
	                var newVer = response.version;
	                var wgtUrl = response.url;
	                if(util.wgtVer&&newVer&&(util.wgtVer!=newVer)){
	                	checkCb && checkCb(true);
	                    util.downWgt(wgtUrl,downloadCb,installCb);  // 下载升级包
	                }else{
	                	checkCb && checkCb(false);
	                	plus.nativeUI.closeWaiting();
	                }
	            }else{
	                plus.nativeUI.alert("检测更新失败！");
	                checkCb && checkCb(false);
	            }
	            break;
	            default:
	            break;
        	}
    	}
	    xhr.open('GET',util.host+'/wgtVerCheck');
	    xhr.send();
	},
	// 下载wgt文件
	downWgt: function (wgtUrl,downloadCb,installCb){
	    plus.nativeUI.showWaiting("下载wgt文件...");
	    plus.downloader.createDownload(wgtUrl, {filename:"_doc/update/"}, function(d,status){
	        if ( status == 200 ) { 
	        	downloadCb && downloadCb(true);
	            util.installWgt(d.filename,installCb); // 安装wgt包
	        } else {
	            plus.nativeUI.alert("下载wgt失败！");
	            downloadCb && downloadCb(false);
	        }
	        plus.nativeUI.closeWaiting();
	    }).start();
	},
	// 更新应用资源
	installWgt: function (path,installCb){
	    plus.nativeUI.showWaiting("安装wgt文件...");
	    plus.runtime.install(path,{},function(){
	        plus.nativeUI.closeWaiting();
	        installCb && installCb(true);
	        plus.nativeUI.alert("应用资源更新完成！",function(){
	            plus.runtime.restart();
	        });
	    },function(e){
	        plus.nativeUI.closeWaiting();
	        plus.nativeUI.alert("安装wgt文件失败["+e.code+"]："+e.message);
	        installCb && installCb(false);
	    });
	},
	plusReady: function(checkCb,downloadCb,installCb){
		plus.runtime.getProperty(plus.runtime.appid,function(inf){
			util.wgtVer=inf.version;
			util.checkUpdate(checkCb,downloadCb,installCb);
		})
	}
}


