#include "Ugc.h"
#include <stdio.h>
#include <windows.h>

int main(int argc, char *argv[]){

	enum class MODE{
		DEFAULT,
		DECODE,
		ENCODE,
	};
	MODE mode = MODE::DEFAULT;
  const char *path_input = nullptr;
  const char *path_output = nullptr;
	const char *path_dtype = nullptr;
	for(int i = 1; i < argc; ++i){
		if(*argv[i] == '-'){
			switch(argv[i][1]){
			case 'o':
				if(i + 1 < argc){
					path_output = argv[++i];
				}else{
					fprintf(stderr, "Error: -o オプションに出力ファイル名がありません。\n");
					return 1;
				}
				break;
			case 'd':
				mode = MODE::DECODE;
				break;
			case 'e':
				mode = MODE::ENCODE;
				break;
			case 't':
				if(i + 1 < argc){
					path_dtype = argv[++i];
				}else{
					fprintf(stderr, "Error: -t オプションにdtypeファイル名がありません。\n");
					return 1;
				}
				break;
			}
		}else{
      path_input = argv[i];
    }
  }
  if(!path_input){
    fprintf(stderr, "使い方: %s [オプション] 入力ファイル名\n", argv[0]);
    fprintf(stderr, "オプション:\n");
    fprintf(stderr, "  -d : デコードモード gil,gia→json\n");
		fprintf(stderr, "  -e : エンコードモード json→gil,gia\n");
		fprintf(stderr, "  -o 出力ファイル名 : 出力ファイル名を指定(デフォルト:output.json、output.gil、output.gia)\n");
		fprintf(stderr, "  -t dtypeファイル名 : dtypeファイル名を指定(デフォルト:dtype.json)\n");
    return 1;
  }

	// モード判定
	if(mode == MODE::DEFAULT){
		auto size = strlen(path_input);
		if(size >= 5 && _stricmp(&path_input[size - 5], ".json") == 0){
			mode = MODE::ENCODE;
		}else{
			mode = MODE::DECODE;
		}
	}

	if(!path_output){
		if(mode == MODE::DECODE){
			path_output = "output.json";
		}
	}
	if(!path_dtype){
		path_dtype = "dtype.json";
	}

	// 初期化
	Ugc ugc;
	if(!ugc.load_dtype(path_dtype)){
		printf("エラー: dtypeファイルが読み込めませんでした。\n");
		return 1;
	}

	// デコード
	if(mode == MODE::DECODE){
		if(!ugc.load_file(path_input)){
			printf("エラー: 入力ファイルが読み込めませんでした。\n");
			return 1;
		}
		if(!ugc.save_json(path_output)){
			printf("エラー: 出力ファイルが書き込めませんでした。\n");
			return 1;
		}
	}

	// エンコード
	else if(mode == MODE::ENCODE){
		if(!ugc.load_json(path_input)){
			printf("エラー: 入力ファイルが読み込めませんでした。\n");
			return 1;
		}
		if(!path_output){
			if(ugc.is_gil()){
				path_output = "output.gil";
			}else{
				path_output = "output.gia";
			}
		}
		if(!ugc.save_file(path_output)){
			printf("エラー: 出力ファイルが書き込めませんでした。\n");
			return 1;
		}
	}

	// ログ
	if(ugc.is_update()){
		printf("dtypeファイルの更新あり\n");
		std::string new_path;
		try{
			new_path = std::string(path_dtype) + ".bak";
			MoveFileExA(path_dtype, new_path.c_str(), MOVEFILE_REPLACE_EXISTING);
		}catch(...){
		}
		if(!ugc.save_dtype(path_dtype) && !new_path.empty()){
			MoveFileExA(new_path.c_str(), path_dtype, MOVEFILE_REPLACE_EXISTING);
		}
		//ugc.print_log();
	}

	return 0;
}
