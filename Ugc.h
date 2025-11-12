#pragma once

#include "Dtype.h"
#include "UgcData.h"
#include "Log.h"

class Ugc{
public:
	Ugc()noexcept{}

	bool load_dtype(const char *path)noexcept{return _dtype.load(path);}
	bool save_dtype(const char *path)noexcept{return _dtype.save(path);}

	bool load_file(const char *path)noexcept;
	bool save_file(const char *path)noexcept;

	bool load_json(const char *path)noexcept{return _data.load(path);}
	bool save_json(const char *path)noexcept{return _data.save(path);}

	bool is_gil(void)noexcept;

	bool is_update(void)const noexcept{return _log.is_update();}
	void print_log(void)noexcept{_log.print();}

private:
	enum class CodeType{
		int_t = 0,
		// 1 不明
		data_t = 2,
		// 3 不明
		// 4 不明
		float_t = 5,
		// 6 不明
		// 7 不明
	};
	Dtype _dtype{};
	UgcData _data{};
	Log _log{};
};
