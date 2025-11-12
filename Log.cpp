#include "Log.h"
#include <stdio.h>

bool Log::add_type_unknown(uint32_t line, uint32_t id, uint8_t type)noexcept{
	Data data = {};
	data.type = Data::Type::type_unknown;
	data.line = line;
	data.id = id;
	data.unknown_type = type;
	try{
		_logs.push_back(data);
	}catch(...){
		return false;
	}
	return true;
}

bool Log::add_insert_int(uint32_t line, uint32_t id, uint32_t value)noexcept{
	Data data = {};
	data.type = Data::Type::insert_int;
	data.line = line;
	data.id = id;
	data.value_int = value;
	try{
		_logs.push_back(data);
	}catch(...){
		return false;
	}
	return true;
}

bool Log::add_insert_float(uint32_t line, uint32_t id, double value)noexcept{
	Data data = {};
	data.type = Data::Type::insert_float;
	data.line = line;
	data.id = id;
	data.value_float = value;
	try{
		_logs.push_back(data);
	}catch(...){
		return false;
	}
	return true;
}

bool Log::add_insert_unknown(uint32_t line, uint32_t id, const uint8_t *data_, size_t data_size)noexcept{
	Data data = {};
	data.type = Data::Type::insert_unknown;
	data.line = line;
	data.id = id;
	try{
		data.value_data = std::vector<uint8_t>(data_, data_ + data_size);
		_logs.push_back(data);
	}catch(...){
		return false;
	}
	return true;
}

bool Log::add_is_array(uint32_t line, uint32_t id)noexcept{
	Data data = {};
	data.type = Data::Type::is_array;
	data.line = line;
	data.id = id;
	try{
		_logs.push_back(data);
	}catch(...){
		return false;
	}
	return true;
}

bool Log::add_unknown(uint32_t line, uint32_t id, const std::vector<uint8_t> &data_)noexcept{
	Data data = {};
	data.type = Data::Type::unknown;
	data.line = line;
	data.id = id;
	try{
		data.value_data = data_;
		_logs.push_back(data);
	}catch(...){
		return false;
	}
	return true;
}

bool Log::is_update(void)const noexcept{
	for(const auto &log : _logs){
		if(log.line > 0){
			return true;
		}
	}
	return false;
}

void Log::print(void)noexcept{

	_logs.sort([](const Data &a, const Data &b)noexcept -> bool {
    return a.line < b.line;
	});

	for(const auto &log : _logs){
		if(log.line == 0){
			continue;
		}
		printf("%d行目: ", log.line);
		switch(log.type){
		case Data::Type::type_unknown:
			printf("ブロック内に不明な型を検出 型=%d\n", log.unknown_type);
			break;
		case Data::Type::insert_int:
			printf("ブロック内に不明なIDを検出 ID=%d 型=int 値=%d\n", log.id, log.value_int);
			break;
		case Data::Type::insert_float:
			printf("ブロック内に不明なIDを検出 ID=%d 型=float 値=%f\n", log.id, log.value_float);
			break;
		case Data::Type::insert_unknown:
			printf("ブロック内に不明なIDを検出 ID=%d 型=不明 サイズ=0x%X データ= ", log.id, static_cast<uint32_t>(log.value_data.size()));
			if(!log.value_data.empty()){
				auto size = log.value_data.size() > 16 ? 16 : log.value_data.size();
				for(auto s = &log.value_data[0]; size; --size, ++s){
					printf("%02X ", *s);
				}
			}
			printf("\n");
			break;
		case Data::Type::is_array:
			printf("複数の同一IDを検出。要配列化 ID=%d\n", log.id);
			break;
		case Data::Type::unknown:
			printf("型が未特定 ID=%d サイズ=0x%X データ= ", log.id, static_cast<uint32_t>(log.value_data.size()));
			{
				auto size = log.value_data.size() > 16 ? 16 : log.value_data.size();
				for(auto s = &log.value_data[0]; size; --size, ++s){
					printf("%02X ", *s);
				}
			}
			printf("\n");
			break;
		}
	}

}
